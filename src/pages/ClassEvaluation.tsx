import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

export function ClassEvaluation() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState("1B");

  const [cls, setCls] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [activeMatrix, setActiveMatrix] = useState<any>(null);
  const [historicalMatrices, setHistoricalMatrices] = useState<
    Record<string, any>
  >({});
  const [configConflict, setConfigConflict] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [studentFilter, setStudentFilter] = useState("ALL"); // ALL, NOT_STARTED, IN_PROGRESS, COMPLETED

  const [savingState, setSavingState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savingError, setSavingError] = useState("");
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [localReport, setLocalReport] = useState<{
    strengths: string;
    developmentAspects: string;
    additionalInformation: string;
    finalText: string;
  }>({
    strengths: "",
    developmentAspects: "",
    additionalInformation: "",
    finalText: "",
  });

  // Ref to hold the timeout for debounced saving
  const reportSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
  }, [classId, period]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    setActiveMatrix(null);
    setHistoricalMatrices({});
    setConfigConflict(false);
    setStudents([]);
    setAssessments([]);
    setSelectedStudentId(null);

    try {
      const token = await user?.getIdToken();

      // 1. Get Class Info & Students (reusing academic route)
      const resClass = await fetch(`/api/academic/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataClass = await resClass.json();
      const currentClass = dataClass.classes?.find(
        (c: any) => c.id === classId,
      );
      if (!currentClass) {
        throw new Error("Turma não encontrada ou acesso negado.");
      }

      setCls(currentClass);

      const resStudents = await fetch(
        `/api/academic/classes/${classId}/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const dataStudents = await resStudents.json();
      if (!dataStudents.success) throw new Error(dataStudents.error);

      const sortedStudents = dataStudents.students.sort((a: any, b: any) =>
        a.name.localeCompare(b.name),
      );
      setStudents(sortedStudents);

      if (sortedStudents.length > 0) {
        setSelectedStudentId(sortedStudents[0].id);
      }

      // 2. Get Evaluation Data (Assessments, Active Matrix, Historical Matrices)
      const resEval = await fetch(
        `/api/academic/classes/${classId}/evaluation-data?period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const dataEval = await resEval.json();

      if (!dataEval.success) throw new Error(dataEval.error);

      setActiveMatrix(dataEval.activeMatrix);
      setConfigConflict(dataEval.configConflict);
      setAssessments(dataEval.assessments);
      setReports(dataEval.reports || []);

      const hist: Record<string, any> = {};
      dataEval.historicalMatrices?.forEach((m: any) => {
        hist[m.id] = m;
      });
      setHistoricalMatrices(hist);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (
    enrollmentId: string,
    criterionId: string,
    answer: "D" | "ED" | null,
    currentMatrix: any,
  ) => {
    if (selectedReport?.reportStatus === "VALIDATED") {
      setSavingError(
        "Relatório já validado. Não é possível alterar a avaliação.",
      );
      return;
    }

    setSavingState("saving");
    setSavingError("");

    const currentAss = assessments.find((a) => a.enrollmentId === enrollmentId);
    let expectedRevision = currentAss?.revision;

    // Explicitly calculate the ID for the endpoint mapping
    const assessmentId =
      currentAss?.id || `ass_${enrollmentId}_${currentMatrix.id}_${period}`;

    setAssessments((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((a) => a.enrollmentId === enrollmentId);

      if (idx >= 0) {
        const item = { ...copy[idx] };
        item.answers = { ...item.answers };
        if (answer === null) delete item.answers[criterionId];
        else item.answers[criterionId] = answer;
        copy[idx] = item;
      } else {
        // Creating fake stub just for UI responsiveness while we wait for backend
        copy.push({
          enrollmentId,
          answers: { [criterionId]: answer },
          status: "IN_PROGRESS",
          completionPercentage: 0,
          matrixId: currentMatrix.id,
        });
      }

      return copy;
    });

    try {
      const token = await user?.getIdToken();
      const res = await fetch(
        `/api/academic/assessments/${assessmentId}/answers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            criterionId,
            answer,
            period,
            matrixId: currentMatrix.id,
            matrixVersion: currentMatrix.version,
            expectedRevision,
            enrollmentId,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar.");
      }

      // Update with source of truth
      setAssessments((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((a) => a.enrollmentId === enrollmentId);
        if (idx >= 0) {
          copy[idx] = data.assessment;
        } else {
          copy.push(data.assessment);
        }
        return copy;
      });

      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 2000);
    } catch (e: any) {
      setSavingState("error");
      setSavingError(e.message);
      if (e.message.includes("Recarregue")) {
        setSavingError(e.message);
      }
      // Revert optimistic update by refetching
      fetchData();
    }
  };

  const saveReportNow = async () => {
    if (!selectedStudent || selectedReport?.reportStatus === "VALIDATED")
      return;
    if (reportSaveTimeoutRef.current)
      clearTimeout(reportSaveTimeoutRef.current);

    setSavingState("saving");
    try {
      const payload = {
        period,
        matrixId: stuMatrix?.id,
        strengths: localReport.strengths,
        developmentAspects: localReport.developmentAspects,
        additionalInformation: localReport.additionalInformation,
        finalText: localReport.finalText,
        expectedRevision: selectedReport?.revision,
      };

      const token = await user?.getIdToken();

      const currentAss = assessments.find(
        (a) => a.enrollmentId === selectedStudent.enrollment.id,
      );
      const assessmentId =
        currentAss?.id ||
        `ass_${selectedStudent.enrollment.id}_${stuMatrix?.id}_${period}`;
      const reportId =
        selectedReport?.id || `rep_${selectedStudent.enrollment.id}_${period}`;
      (payload as any).assessmentId = assessmentId;
      (payload as any).enrollmentId = selectedStudent.enrollment.id;

      const res = await fetch(`/api/academic/reports/${reportId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setSavingError(data.error);
          setSavingState("error");
          setSavingError(data.error);
          fetchData();
          return;
        }

        throw new Error(data.error || "Erro ao salvar relatório");
      }
      setReports((prev) => {
        const idx = prev.findIndex((r) => r.id === data.report.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.report;
          return next;
        } else {
          return [...prev, data.report];
        }
      });

      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 2000);
    } catch (err: any) {
      setSavingError(err.message);
      setSavingState("error");
    }
  };

  const handleReportChange = (field: string, value: string) => {
    if (!selectedStudent || selectedReport?.reportStatus === "VALIDATED")
      return;

    setLocalReport((prev) => ({ ...prev, [field]: value }));

    setSavingState("saving");
    setSavingError("");

    if (reportSaveTimeoutRef.current)
      clearTimeout(reportSaveTimeoutRef.current);

    reportSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          period,
          matrixId: stuMatrix?.id,
          [field]: value,
          expectedRevision: selectedReport?.revision,
        };

        const token = await user?.getIdToken();

        const currentAss = assessments.find(
          (a) => a.enrollmentId === selectedStudent.enrollment.id,
        );
        const assessmentId =
          currentAss?.id ||
          `ass_${selectedStudent.enrollment.id}_${stuMatrix?.id}_${period}`;
        const reportId =
          selectedReport?.id ||
          `rep_${selectedStudent.enrollment.id}_${period}`;
        payload.assessmentId = assessmentId;
        payload.enrollmentId = selectedStudent.enrollment.id;

        const res = await fetch(`/api/academic/reports/${reportId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setSavingError(data.error);
            setSavingState("error");
            setSavingError(data.error);
            fetchData();
            return;
          }

          throw new Error(data.error || "Erro ao salvar relatório");
        }

        // Update reports list
        setReports((prev) => {
          const idx = prev.findIndex((r) => r.id === data.report.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.report;
            return next;
          } else {
            return [...prev, data.report];
          }
        });

        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 2000);
      } catch (err: any) {
        setSavingError(err.message);
        setSavingState("error");
      }
    }, 1000);
  };

  const handleTransferMatrix = async () => {
    if (!selectedStudent || !activeMatrix) return;

    setConfirmConfig({
      isOpen: true,
      title: "Transferir Matriz",
      message:
        "ATENÇÃO: Transferir este aluno para a nova Matriz invalidará a revisão pedagógica atual. Deseja continuar?",
      onConfirm: async () => {
        setConfirmConfig(null);

        try {
          const token = await user?.getIdToken();
          const reportId =
            selectedReport?.id ||
            `rep_${selectedStudent.enrollment.id}_${period}`;

          const res = await fetch(
            `/api/academic/reports/${reportId}/transfer`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                enrollmentId: selectedStudent.enrollment.id,
                period,
                newMatrixId: activeMatrix.id,
                newMatrixVersion: activeMatrix.version,
              }),
            },
          );
          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          await fetchData(); // refresh all data
          setSavingError(
            "Transferência concluída. A revisão pedagógica precisará ser refeita.",
          );
        } catch (e: any) {
          console.error(e);
          setSavingError(
            "Erro ao transferir matriz: " + (e.message || "Erro desconhecido."),
          );
        }
      },
    });
  };

  const handleValidateReport = async () => {
    if (!selectedStudent || !selectedReport) return;

    setConfirmConfig({
      isOpen: true,
      title: "Validar Relatório",
      message:
        "Confirma que o relatório foi revisado e está pronto para emissão?",
      onConfirm: async () => {
        setConfirmConfig(null);

        // Clear debounce timeout if any
        if (reportSaveTimeoutRef.current)
          clearTimeout(reportSaveTimeoutRef.current);

        setSavingState("saving");
        try {
          const token = await user?.getIdToken();

          const currentAss = assessments.find(
            (a) => a.enrollmentId === selectedStudent.enrollment.id,
          );
          const assessmentId =
            currentAss?.id ||
            `ass_${selectedStudent.enrollment.id}_${stuMatrix?.id}_${period}`;
          const reportId =
            selectedReport?.id ||
            `rep_${selectedStudent.enrollment.id}_${period}`;
          const payload = {
            enrollmentId: selectedStudent.enrollment.id,
            assessmentId,
            period,
            expectedRevision: selectedReport?.revision,
            strengths: localReport.strengths,
            developmentAspects: localReport.developmentAspects,
            additionalInformation: localReport.additionalInformation,
            finalText: localReport.finalText,
            matrixId: stuMatrix?.id,
          };

          const res = await fetch(
            `/api/academic/reports/${reportId}/validate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            },
          );

          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409) fetchData();
            throw new Error(data.error || "Erro ao validar relatório");
          }
          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === data.report.id);
            const next = [...prev];
            next[idx] = data.report;
            return next;
          });
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 2000);
        } catch (err: any) {
          setSavingError(err.message);
          setSavingState("error");
        }
      },
    });
  };

  const handleReopenReport = async () => {
    if (!selectedStudent || !selectedReport) return;

    setConfirmConfig({
      isOpen: true,
      title: "Reabrir Relatório",
      message:
        "Atenção: A reabertura retornará o relatório para edição. Confirma?",
      onConfirm: async () => {
        setConfirmConfig(null);

        setSavingState("saving");
        try {
          const token = await user?.getIdToken();
          const currentAss = assessments.find(
            (a) => a.enrollmentId === selectedStudent.enrollment.id,
          );
          const assessmentId =
            currentAss?.id ||
            `ass_${selectedStudent.enrollment.id}_${stuMatrix?.id}_${period}`;
          const reportId =
            selectedReport?.id ||
            `rep_${selectedStudent.enrollment.id}_${period}`;
          const res = await fetch(`/api/academic/reports/${reportId}/reopen`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              enrollmentId: selectedStudent.enrollment.id,
              assessmentId,
              period,
              expectedRevision: selectedReport.revision,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (res.status === 409) fetchData();
            throw new Error(data.error || "Erro ao reabrir relatório");
          }

          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === data.report.id);
            const next = [...prev];
            next[idx] = data.report;
            return next;
          });
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 2000);
        } catch (err: any) {
          setSavingError(err.message);
          setSavingState("error");
        }
      },
    });
  };

  const getAssessment = (studentId: string) => {
    const stu = students.find((s) => s.id === studentId);
    if (!stu) return null;
    return assessments.find((a) => a.enrollmentId === stu.enrollment.id);
  };

  const getReport = (studentId: string) => {
    const stu = students.find((s) => s.id === studentId);
    if (!stu) return null;
    return reports.find((r) => r.enrollmentId === stu.enrollment.id);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (studentFilter === "ALL") return true;

      const ass = getAssessment(s.id);
      const rep = getReport(s.id);

      if (studentFilter === "ASS_NOT_STARTED")
        return (ass?.status || "NOT_STARTED") === "NOT_STARTED";
      if (studentFilter === "ASS_IN_PROGRESS")
        return (ass?.status || "NOT_STARTED") === "IN_PROGRESS";
      if (studentFilter === "ASS_COMPLETED")
        return (ass?.status || "NOT_STARTED") === "COMPLETED";

      if (studentFilter === "REP_NOT_STARTED")
        return (rep?.reportStatus || "NOT_STARTED") === "NOT_STARTED";
      if (studentFilter === "REP_IN_PROGRESS")
        return (rep?.reportStatus || "NOT_STARTED") === "IN_PROGRESS";
      if (studentFilter === "REP_READY")
        return (rep?.reportStatus || "NOT_STARTED") === "READY_FOR_REVIEW";
      if (studentFilter === "REP_VALIDATED")
        return (rep?.reportStatus || "NOT_STARTED") === "VALIDATED";

      return true;
    });
  }, [students, assessments, reports, studentFilter]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedAssessment = selectedStudent
    ? getAssessment(selectedStudent.id)
    : null;
  const selectedReport = selectedStudent ? getReport(selectedStudent.id) : null;

  // Sync local report state when selected student changes
  useEffect(() => {
    if (selectedReport) {
      setLocalReport({
        strengths: selectedReport.strengths || "",
        developmentAspects: selectedReport.developmentAspects || "",
        additionalInformation: selectedReport.additionalInformation || "",
        finalText: selectedReport.finalText || "",
      });
    } else {
      setLocalReport({
        strengths: "",
        developmentAspects: "",
        additionalInformation: "",
        finalText: "",
      });
    }
  }, [selectedStudentId, selectedReport]);

  const stuMatrix = selectedAssessment
    ? selectedAssessment.matrixId === activeMatrix?.id
      ? activeMatrix
      : historicalMatrices[selectedAssessment.matrixId]
    : activeMatrix;

  // Indicators
  const totalStudents = students.length;
  const compCount = students.filter(
    (s) => getAssessment(s.id)?.status === "COMPLETED",
  ).length;
  const inProgCount = students.filter(
    (s) => getAssessment(s.id)?.status === "IN_PROGRESS",
  ).length;
  const notStartCount = totalStudents - compCount - inProgCount;
  const compPercent =
    totalStudents > 0 ? Math.round((compCount / totalStudents) * 100) : 0;

  const repValCount = students.filter(
    (s) => getReport(s.id)?.reportStatus === "VALIDATED",
  ).length;
  const repReadyCount = students.filter(
    (s) => getReport(s.id)?.reportStatus === "READY_FOR_REVIEW",
  ).length;
  const repInProgCount = students.filter(
    (s) => getReport(s.id)?.reportStatus === "IN_PROGRESS",
  ).length;
  const repNotStartCount =
    totalStudents - repValCount - repReadyCount - repInProgCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/academic")}
            className="text-sm text-blue-600 hover:underline mb-2 flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Turmas
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
            Avaliação: {cls?.displayName || "Carregando..."}
          </h1>
          <p className="text-gray-500 mt-1">
            Preenchimento de indicadores de desenvolvimento.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="1">1º Bimestre</option>
            <option value="2">2º Bimestre</option>
            <option value="3">3º Bimestre</option>
            <option value="4">4º Bimestre</option>
            <option value="S1">1º Semestre</option>
            <option value="S2">2º Semestre</option>
            <option value="T1">1º Trimestre</option>
            <option value="T2">2º Trimestre</option>
            <option value="T3">3º Trimestre</option>
          </select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Recarregar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-6 rounded-lg flex flex-col items-center justify-center flex-1">
          <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">{error}</p>
        </div>
      ) : configConflict ? (
        <div className="bg-red-50 text-red-800 p-12 rounded-lg flex flex-col items-center justify-center flex-1">
          <AlertCircle className="w-12 h-12 mb-4 opacity-75" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            Conflito de Matrizes
          </h2>
          <p>
            Há mais de uma matriz publicada com a mesma prioridade para esta
            turma e período.
          </p>
          <p className="text-sm mt-2">
            Resolva o conflito no painel MASTER arquivando as matrizes
            redundantes.
          </p>
        </div>
      ) : !activeMatrix && assessments.length === 0 ? (
        <div className="bg-white border border-gray-200 text-gray-600 p-12 rounded-lg flex flex-col items-center justify-center flex-1">
          <AlertCircle className="w-12 h-12 mb-4 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Matriz Indisponível
          </h2>
          <p>
            Esta turma ainda não possui uma matriz avaliativa publicada para o
            período selecionado ({period}).
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          {selectedAssessment &&
            activeMatrix &&
            selectedAssessment.matrixId !== activeMatrix.id && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-amber-900">
                    Nova Matriz Disponível
                  </h3>
                  <p className="text-sm">
                    Este aluno está sendo avaliado em uma versão anterior da
                    Matriz. Uma nova versão foi publicada.
                  </p>
                </div>
                <button
                  onClick={handleTransferMatrix}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-medium transition-colors whitespace-nowrap"
                >
                  Transferir Aluno
                </button>
              </div>
            )}

          {/* Left Sidebar: Student List */}
          <Card className="w-full md:w-80 flex flex-col h-full bg-white border-gray-200 overflow-hidden shrink-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700">
                    Avaliações (D/ED)
                  </span>
                  <span className="text-xs text-gray-500">
                    {compCount}/{totalStudents}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${compPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700">
                    Relatórios Validados
                  </span>
                  <span className="text-xs text-gray-500">
                    {repValCount}/{totalStudents}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width: `${totalStudents > 0 ? Math.round((repValCount / totalStudents) * 100) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="w-full text-xs border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 mt-2"
              >
                <optgroup label="Visão Geral">
                  <option value="ALL">Todos os alunos ({totalStudents})</option>
                </optgroup>
                <optgroup label="Avaliação (D/ED)">
                  <option value="ASS_NOT_STARTED">
                    Não iniciados ({notStartCount})
                  </option>
                  <option value="ASS_IN_PROGRESS">
                    Em preenchimento ({inProgCount})
                  </option>
                  <option value="ASS_COMPLETED">
                    Concluídos ({compCount})
                  </option>
                </optgroup>
                <optgroup label="Relatório Pedagógico">
                  <option value="REP_NOT_STARTED">
                    Não iniciados ({repNotStartCount})
                  </option>
                  <option value="REP_IN_PROGRESS">
                    Em elaboração ({repInProgCount})
                  </option>
                  <option value="REP_READY">
                    Prontos p/ revisão ({repReadyCount})
                  </option>
                  <option value="REP_VALIDATED">
                    Validados ({repValCount})
                  </option>
                </optgroup>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Nenhum aluno.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredStudents.map((stu) => {
                    const ass = getAssessment(stu.id);
                    const isSelected = selectedStudentId === stu.id;
                    const status = ass?.status || "NOT_STARTED";
                    const pct = ass?.completionPercentage || 0;
                    const rep = getReport(stu.id);
                    const repStatus = rep?.reportStatus || "NOT_STARTED";

                    return (
                      <li key={stu.id}>
                        <button
                          onClick={() => setSelectedStudentId(stu.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${isSelected ? "bg-blue-50/50 border-l-4 border-blue-600" : "border-l-4 border-transparent"}`}
                        >
                          <div className="truncate pr-2">
                            <div
                              className={`font-medium text-sm truncate ${isSelected ? "text-blue-900" : "text-gray-900"}`}
                            >
                              {stu.name}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                              <span>
                                Avaliação:{" "}
                                <strong
                                  className={
                                    status === "COMPLETED"
                                      ? "text-green-600"
                                      : status === "IN_PROGRESS"
                                        ? "text-amber-600"
                                        : ""
                                  }
                                >
                                  {status === "COMPLETED"
                                    ? "Concluída"
                                    : status === "IN_PROGRESS"
                                      ? `${pct}%`
                                      : "Não iniciada"}
                                </strong>
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-2">
                              <span>
                                Relatório:{" "}
                                <strong
                                  className={
                                    repStatus === "VALIDATED"
                                      ? "text-green-600"
                                      : repStatus === "READY_FOR_REVIEW"
                                        ? "text-blue-600"
                                        : repStatus === "IN_PROGRESS"
                                          ? "text-amber-600"
                                          : ""
                                  }
                                >
                                  {repStatus === "VALIDATED"
                                    ? "Validado"
                                    : repStatus === "READY_FOR_REVIEW"
                                      ? "Pronto para revisão"
                                      : repStatus === "IN_PROGRESS"
                                        ? "Em elaboração"
                                        : "Não iniciado"}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {status === "COMPLETED" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : status === "IN_PROGRESS" ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                            )}
                            {repStatus === "VALIDATED" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : repStatus === "READY_FOR_REVIEW" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                            ) : repStatus === "IN_PROGRESS" ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          {/* Right Area: Evaluation Form */}
          <Card className="flex-1 flex flex-col h-full bg-white border-gray-200 overflow-hidden">
            {selectedStudent ? (
              <>
                <CardHeader className="bg-gray-50 border-b border-gray-100 py-4 px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-[#0f172a]">
                      {selectedStudent.name}
                    </CardTitle>
                    <CardDescription>
                      Matrícula: {selectedStudent.enrollment.externalStudentId}{" "}
                      • {selectedAssessment?.completionPercentage || 0}%
                      preenchido
                    </CardDescription>
                  </div>

                  {/* Autosave Indicator */}
                  <div className="flex items-center text-sm font-medium">
                    {savingState === "saving" && (
                      <span className="text-gray-500 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />{" "}
                        Salvando...
                      </span>
                    )}
                    {savingState === "saved" && (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Salvo
                      </span>
                    )}
                    {savingState === "error" && (
                      <span
                        className="text-red-600 flex items-center"
                        title={savingError}
                      >
                        <AlertCircle className="w-4 h-4 mr-1.5" /> Erro ao
                        salvar
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                  {!stuMatrix ? (
                    <div className="bg-white border border-gray-200 text-gray-600 p-12 rounded-lg flex flex-col items-center justify-center">
                      <AlertCircle className="w-12 h-12 mb-4 text-amber-500" />
                      <h2 className="text-lg font-bold text-gray-900 mb-2">
                        Matriz Indisponível
                      </h2>
                      <p>Não há matriz ativa para avaliar este aluno.</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-8 pb-12">
                      {/* D/ED Matrix */}
                      <div>
                        <h2 className="text-lg font-bold text-[#0f172a] mb-4 flex items-center">
                          1. Avaliação D/ED
                          {selectedAssessment?.status === "COMPLETED" && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                          )}
                        </h2>
                        <div className="space-y-6">
                          {stuMatrix.categories.map((catName: string) => {
                            const criteria = stuMatrix.criteria.filter(
                              (c: any) => c.category === catName,
                            );
                            if (criteria.length === 0) return null;

                            return (
                              <div
                                key={catName}
                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                              >
                                <div className="bg-[#0f172a] px-5 py-3">
                                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                                    {catName}
                                  </h3>
                                </div>

                                <div className="divide-y divide-gray-100">
                                  {criteria.map((crit: any) => {
                                    const ans =
                                      selectedAssessment?.answers?.[crit.id] ||
                                      null;

                                    return (
                                      <div
                                        key={crit.id}
                                        className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-gray-50/50 transition-colors"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                              {crit.code}
                                            </span>
                                            {crit.required && (
                                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                                Obrigatório
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-900 leading-relaxed">
                                            {crit.objective}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 md:pt-2">
                                          <button
                                            onClick={() =>
                                              handleAnswer(
                                                selectedStudent.enrollment.id,
                                                crit.id,
                                                ans === "D" ? null : "D",
                                                stuMatrix,
                                              )
                                            }
                                            className={`w-14 h-10 rounded-md font-bold text-sm border transition-all ${
                                              ans === "D"
                                                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20 ring-offset-1"
                                                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                            }`}
                                            disabled={
                                              selectedReport?.reportStatus ===
                                              "VALIDATED"
                                            }
                                          >
                                            D
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleAnswer(
                                                selectedStudent.enrollment.id,
                                                crit.id,
                                                ans === "ED" ? null : "ED",
                                                stuMatrix,
                                              )
                                            }
                                            className={`w-14 h-10 rounded-md font-bold text-sm border transition-all ${
                                              ans === "ED"
                                                ? "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-500/20 ring-offset-1"
                                                : "bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                                            }`}
                                            disabled={
                                              selectedReport?.reportStatus ===
                                              "VALIDATED"
                                            }
                                          >
                                            ED
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      {/* Registros Pedagógicos */}
                      <div>
                        <h2 className="text-lg font-bold text-[#0f172a] mb-4">
                          2. Registros Pedagógicos
                        </h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Potencialidades
                            </label>
                            <textarea
                              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[100px]"
                              placeholder="Descreva as potencialidades do aluno..."
                              value={localReport.strengths}
                              onChange={(e) =>
                                handleReportChange("strengths", e.target.value)
                              }
                              onBlur={saveReportNow}
                              disabled={
                                selectedReport?.reportStatus === "VALIDATED"
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Aspectos em desenvolvimento
                            </label>
                            <textarea
                              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[100px]"
                              placeholder="Descreva os aspectos em desenvolvimento..."
                              value={localReport.developmentAspects}
                              onChange={(e) =>
                                handleReportChange(
                                  "developmentAspects",
                                  e.target.value,
                                )
                              }
                              onBlur={saveReportNow}
                              disabled={
                                selectedReport?.reportStatus === "VALIDATED"
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Informações complementares
                            </label>
                            <textarea
                              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[100px]"
                              placeholder="Outras observações relevantes..."
                              value={localReport.additionalInformation}
                              onChange={(e) =>
                                handleReportChange(
                                  "additionalInformation",
                                  e.target.value,
                                )
                              }
                              onBlur={saveReportNow}
                              disabled={
                                selectedReport?.reportStatus === "VALIDATED"
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      {/* Parecer Pedagógico */}
                      <div>
                        <h2 className="text-lg font-bold text-[#0f172a] mb-4">
                          3. Parecer Pedagógico
                        </h2>
                        <div className="space-y-4">
                          <textarea
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[200px]"
                            placeholder="Escreva o parecer final que será impresso no relatório..."
                            value={localReport.finalText}
                            onChange={(e) =>
                              handleReportChange("finalText", e.target.value)
                            }
                            onBlur={saveReportNow}
                            disabled={
                              selectedReport?.reportStatus === "VALIDATED"
                            }
                          />
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      {/* Validation */}
                      <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-xl flex flex-col items-center text-center space-y-4">
                        <h2 className="text-lg font-bold text-[#0f172a]">
                          4. Validação do Relatório
                        </h2>

                        {selectedReport?.reportStatus === "VALIDATED" ? (
                          <>
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Relatório Validado
                            </div>
                            <p className="text-sm text-gray-600">
                              Este relatório foi concluído e está bloqueado para
                              edições.
                            </p>
                            <Button
                              variant="outline"
                              onClick={handleReopenReport}
                              className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              Reabrir relatório
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600 max-w-lg">
                              Confira se a avaliação D/ED está completa e se o
                              parecer pedagógico foi devidamente preenchido
                              antes de validar.
                            </p>

                            <div className="flex gap-4 w-full max-w-sm">
                              <div
                                className={`flex-1 p-3 rounded-lg border text-sm ${selectedAssessment?.status === "COMPLETED" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                              >
                                <div className="font-bold">Avaliação</div>
                                {selectedAssessment?.status === "COMPLETED"
                                  ? "Concluída"
                                  : "Pendente"}
                              </div>
                              <div
                                className={`flex-1 p-3 rounded-lg border text-sm ${(localReport.finalText?.trim()?.length || 0) > 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                              >
                                <div className="font-bold">Parecer</div>
                                {(localReport.finalText?.trim()?.length || 0) >
                                0
                                  ? "Preenchido"
                                  : "Vazio"}
                              </div>
                            </div>

                            <Button
                              onClick={handleValidateReport}
                              disabled={
                                selectedAssessment?.status !== "COMPLETED" ||
                                (localReport.finalText?.trim()?.length || 0) ===
                                  0 ||
                                savingState === "saving"
                              }
                              className="w-full max-w-sm mt-4 bg-[#0f172a] hover:bg-[#1e293b]"
                            >
                              Validar relatório
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Footer Nav */}
                <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>
                      <strong className="text-gray-900">D:</strong> Desenvolveu
                    </span>
                    <span>
                      <strong className="text-gray-900">ED:</strong> Em
                      desenvolvimento
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const idx = filteredStudents.findIndex(
                          (s) => s.id === selectedStudentId,
                        );
                        if (idx > 0)
                          setSelectedStudentId(filteredStudents[idx - 1].id);
                      }}
                      disabled={
                        filteredStudents.findIndex(
                          (s) => s.id === selectedStudentId,
                        ) <= 0
                      }
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      onClick={() => {
                        const idx = filteredStudents.findIndex(
                          (s) => s.id === selectedStudentId,
                        );
                        if (idx < filteredStudents.length - 1)
                          setSelectedStudentId(filteredStudents[idx + 1].id);
                      }}
                      disabled={
                        filteredStudents.findIndex(
                          (s) => s.id === selectedStudentId,
                        ) >=
                        filteredStudents.length - 1
                      }
                    >
                      Próximo <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Selecione um aluno para avaliar.</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
