const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

const targetCatch = `    } catch (err) {
      console.error(err);
    }`;

const newCatch = `    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded')) {
         setActionError('Limite de cota do banco de dados atingido (RESOURCE_EXHAUSTED). Tente novamente no próximo ciclo.');
      } else {
         console.error(err);
      }
    }`;

code = code.replace(targetCatch, newCatch);
fs.writeFileSync('src/pages/Users.tsx', code);
console.log("Users.tsx patched");
