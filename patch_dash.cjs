const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetCatch = `      } catch (error) {
        console.error(error);
      }`;

const newCatch = `      } catch (error: any) {
        if (error?.code === 'resource-exhausted' || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
           setError('Aviso: Limite de cota do banco de dados atingido (RESOURCE_EXHAUSTED). Os dados podem não ser carregados.');
        } else {
           console.error(error);
        }
      }`;

if (code.includes(targetCatch)) {
  code = code.replace(targetCatch, newCatch);
  // also add error state
  const targetState = `const [brands, setBrands] = useState<any[]>([]);`;
  const newState = `const [error, setError] = useState<string>('');\n  const [brands, setBrands] = useState<any[]>([]);`;
  code = code.replace(targetState, newState);

  const targetRender = `      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Meu acesso</h1>`;
  const newRender = `      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-center">
          <span className="font-medium">{error}</span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Meu acesso</h1>`;
  code = code.replace(targetRender, newRender);

  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log("Dashboard patched");
}
