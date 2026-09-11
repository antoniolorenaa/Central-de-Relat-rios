import re

with open('broken_class.txt', 'r') as f:
    lines = [re.sub(r'^\s*\d+\t', '', line).rstrip('\n') for line in f]

# Remove the duplicates of imports or state declarations
new_lines = []
for i, line in enumerate(lines):
    if line == "import { ConfirmModal } from '../components/ui/ConfirmModal';" and "import { ConfirmModal } from '../components/ui/ConfirmModal';" in new_lines:
        continue
    if "const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);" in line and "const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);" in new_lines:
        continue
    new_lines.append(line)

lines = new_lines

out = []
i = 0
while i < len(lines):
    line = lines[i]
    
    if "if (sortedStudents.length > 0) {" in line:
        out.append(line)
        out.append(lines[i+1])
        out.append("      }")
        i += 2
        continue
        
    if "const resEval = await fetch(`/api/academic/classes/${classId}/evaluation-data?period=${period}`, {" in line:
        out.append(line)
        out.append(lines[i+1].replace(" );", " });"))
        i += 2
        continue
        
    if line == " else {":
        out.append("      } else {")
        i += 1
        continue
        
    if "matrixId: currentMatrix.id" in line and "  );" in lines[i+1]:
        out.append(line)
        out.append("        });")
        i += 2
        continue

    if line == "" and i > 0 and "return copy;" in lines[i-1]:
        out.append("    });")
        out.append("")
        i += 1
        continue

    if "  'Content-Type': 'application/json'" in line and "  ," in lines[i+1]:
        out.append("          'Content-Type': 'application/json'")
        out.append("        },")
        i += 2
        continue

    if "          enrollmentId" in line and "  )" in lines[i+1] and ");" in lines[i+2]:
        out.append("          enrollmentId")
        out.append("        })")
        out.append("      });")
        i += 3
        continue
        
    if "        finalText: localReport.finalText" in line and "  )" in lines[i+1] and ");" in lines[i+2]:
        out.append("        finalText: localReport.finalText")
        out.append("        })")
        out.append("      });")
        i += 3
        continue
        
    if "        expectedRevision: selectedReport?.revision" in line and "  ;" in lines[i+1]:
        out.append("        expectedRevision: selectedReport?.revision")
        out.append("      };")
        i += 2
        continue

    # newMatrixVersion: activeMatrix.version
    if "          newMatrixVersion: activeMatrix.version" in line and "  )" in lines[i+1] and ");" in lines[i+2]:
        out.append("          newMatrixVersion: activeMatrix.version")
        out.append("        })")
        out.append("      });")
        i += 3
        continue

    if "        body: JSON.stringify({ expectedRevision: selectedReport?.revision })" in line and "  );" in lines[i+1]:
        out.append("        body: JSON.stringify({ expectedRevision: selectedReport?.revision })")
        out.append("      });")
        i += 2
        continue
        
    if "        body: JSON.stringify({ expectedRevision: selectedReport.revision })" in line and "  );" in lines[i+1]:
        out.append("        body: JSON.stringify({ expectedRevision: selectedReport.revision })")
        out.append("      });")
        i += 2
        continue

    if "        body: JSON.stringify({ targetMatrixId, targetMatrixVersion })" in line and "  );" in lines[i+1]:
        out.append("        body: JSON.stringify({ targetMatrixId, targetMatrixVersion })")
        out.append("      });")
        i += 2
        continue

    # Closing braces for the try blocks wrapping onConfirm
    if "        setConfirmConfig(null);" in line and "    try {" in lines[i+2]:
        out.append("        setConfirmConfig(null);")
        out.append("        try {")
        i += 2
        continue
        
    # the end of the fetch inside the onConfirm block
    if "      setSavingState('error');" in line and "      setSavingError(e.message);" in lines[i+1] and "    } finally {" in lines[i+2]:
        out.append("        } catch (e: any) {")
        out.append("          setSavingState('error');")
        out.append("          setSavingError(e.message);")
        out.append("        } finally {")
        out.append("          setLoading(false);")
        out.append("        }")
        out.append("      }")
        out.append("    });")
        i += 5
        continue

    out.append(line)
    i += 1

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write("\n".join(out))
