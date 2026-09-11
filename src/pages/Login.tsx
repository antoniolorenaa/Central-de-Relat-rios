import React from 'react';
import { useAuth } from '../lib/auth';
import { auth } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

export function Login() {
  const { signIn, bootstrap, user, profile, error, loading } = useAuth();

  // If user is authenticated in Firebase but profile sync failed / doesn't exist
  if (user && !profile && !loading) {
    const isQuotaError = error?.includes('RESOURCE_EXHAUSTED') || error?.includes('cota') || error?.includes('Quota');

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center flex flex-col items-center">
            <h2 className="text-xl font-semibold text-[#0f172a] mb-4">
              {isQuotaError ? 'Cota do Firestore Excedida' : 'Acesso Restrito'}
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {error || 'Seu acesso à Central de Relatórios Pedagógicos ainda não foi liberado. Entre em contato com a administração responsável.'}
            </p>
            {isQuotaError && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 text-left">
                <p className="font-semibold mb-1">Cota diária gratuita atingida:</p>
                <p className="mb-2">A cota gratuita (Spark) do Firestore é renovada diariamente. Para aumentar os limites sem interrupções, você pode atualizar o plano no console do Firebase.</p>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0443933607/firestore/databases/ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-medium hover:text-blue-800"
                >
                  Abrir Firebase Console para Upgrade
                </a>
              </div>
            )}
            <div className="flex flex-col w-full gap-3">
              <Button onClick={() => bootstrap()} variant="outline" className="w-full">
                Tentar Configuração Mestre
              </Button>
              <Button onClick={async () => { await auth.signOut(); window.location.reload(); }} variant="primary" className="w-full">
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f172a]">
          Central de Relatórios Pedagógicos
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestão e acompanhamento institucional
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <Button
              onClick={signIn}
              disabled={loading}
              className="w-full py-6 text-base shadow-sm"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Entrando...' : 'Entrar com Google'}
            </Button>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Acesso exclusivo para usuários autorizados.
            </p>
            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
