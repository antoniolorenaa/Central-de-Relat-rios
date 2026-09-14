const fs = require('fs');
let code = fs.readFileSync('tests/test-consolidated.ts', 'utf8');

code = code.replace(
  /class MockDocRef \{/,
  `class MockDocRef {
  constructor(public path: string) {}
  get id() { return this.path.split('/').pop()!; }
  collection(name: string) { return new MockCollection(this.path + '/' + name); }
  
  async get() {
    const data = global.mockDb.store.get(this.path);
    return {
      exists: !!data,
      data: () => data ? structuredClone(data) : undefined,
      ref: this,
      id: this.id
    };
  }
  
  async set(data: any, options?: any) {
    if (options && options.merge) {
      const existing = global.mockDb.store.get(this.path) || {};
      global.mockDb.store.set(this.path, { ...existing, ...structuredClone(data) });
    } else {
      global.mockDb.store.set(this.path, structuredClone(data));
    }
  }
  
  async update(data: any) {
    const existing = global.mockDb.store.get(this.path);
    if (!existing) throw new Error("Doc missing: " + this.path);
    global.mockDb.store.set(this.path, { ...existing, ...structuredClone(data) });
  }
`
);

// We need to export db to global.mockDb so MockDocRef can access it
code = code.replace(
  /const db = new MockFirestore\(\);/,
  `const db = new MockFirestore();\n  (global as any).mockDb = db;`
);

code = code.replace(
  /class MockDocRef \{\s*constructor\(public path: string\) \{\}\s*get id\(\) \{ return this\.path\.split\('\/'\)\.pop\(\)!\; \}\s*collection\(name: string\) \{ return new MockCollection\(this\.path \+ '\/' \+ name\)\; \}\s*\n\s*class MockDocRef \{/,
  `class MockDocRef {`
); // fix double declaration

fs.writeFileSync('tests/test-consolidated.ts', code);
