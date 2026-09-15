const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

const testCode = `
  await runTest("12. Frontend: handleStudentSelection cancelado preserva timeout e token", async () => {
    const fs = require('fs');
    const reactCode = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');
    
    const match = reactCode.match(/const handleStudentSelection = \\(newStudentId: string\\) => \\{([\\s\\S]*?)\\n  \\};/);
    if (!match) throw new Error("Function handleStudentSelection not found in ClassEvaluation.tsx");
    let funcBody = match[1];
    
    // Mocks
    let isReportDirty = true;
    let savingState = 'error'; // triggers confirm
    let timeoutCleared = false;
    let tokenIncremented = false;
    let confirmCalled = false;
    
    const mockWindow = {
      confirm: () => { confirmCalled = true; return false; } // Usuario cancela
    };
    
    const reportSaveTimeoutRef = { current: 999 };
    const mockClearTimeout = () => { timeoutCleared = true; };
    
    let tokenVal = 0;
    const saveTokenRef = { 
      get current() { return tokenVal; },
      set current(val) { tokenIncremented = true; tokenVal = val; }
    };
    
    let stateChanged = false;
    const setIsReportDirty = () => { stateChanged = true; };
    const setSavingState = () => { stateChanged = true; };
    const setSavingError = () => { stateChanged = true; };
    const setSelectedStudentId = () => { stateChanged = true; };
    
    // Strip out TypeScript typings if there were any in the function body, but it's mostly JS.
    // The only TS might be the argument, but we extracted the body only!
    const fn = new Function(
      'isReportDirty', 'savingState', 'window', 'reportSaveTimeoutRef', 
      'clearTimeout', 'saveTokenRef', 'setIsReportDirty', 
      'setSavingState', 'setSavingError', 'setSelectedStudentId', 
      funcBody
    );
    
    fn(
      isReportDirty, savingState, mockWindow, reportSaveTimeoutRef, 
      mockClearTimeout, saveTokenRef, setIsReportDirty, 
      setSavingState, setSavingError, setSelectedStudentId
    );
    
    assert.strictEqual(confirmCalled, true, 'Confirm deveria ser chamado');
    assert.strictEqual(timeoutCleared, false, 'Timeout não deve ser cancelado se o usuário abortar');
    assert.strictEqual(tokenIncremented, false, 'Token não deve ser incrementado se o usuário abortar');
    assert.strictEqual(stateChanged, false, 'Nenhum state setter deveria ser chamado');
  });
`;

code = code.replace(/console\.log\([^)]*Results:[^)]*\);/, testCode + '\n  $&');
fs.writeFileSync('tests/test-consolidated.ts', code);
