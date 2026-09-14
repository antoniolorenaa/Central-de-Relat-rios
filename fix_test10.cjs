const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /const invokeRoute = async/g,
  `const invokeRoute = async (path: string, body: any, params: any) => {
    const routeHandlers = handlers[path];
    if (!routeHandlers) throw new Error("Route not found: " + path);
    const { req, res, getResult } = mockReqRes(body, params);
    for (const handler of routeHandlers) {
      let nextCalled = false;
      await handler(req, res, () => { nextCalled = true; });
      if (!nextCalled) break;
    }
    const result = getResult();
    if (result.statusCode === 400) console.error("400 ERROR:", result.responseData);
    return result;
  };
  const _ignore = async`
);

fs.writeFileSync('tests/test-consolidated.ts', code);
