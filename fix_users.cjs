const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

code = code.replace(
  /const \[editingUser, setEditingUser\] = useState<any \| null>\(null\);/,
  `const [editingUser, setEditingUser] = useState<any | null>(null);\n  const [confirmConfig, setConfirmConfig] = useState<any>(null);\n  const [actionError, setActionError] = useState('');`
);

code = code.replace(
  /const handleToggleActive = async \(u: any\) => \{\s*\n\s*if \(u\.active\) \{\s*\n\s*console\.log\(\{([\s\S]*?)\}\);\s*\n\s*return;\s*\n\s*\}/,
  `const handleToggleActive = async (u: any) => {
    setActionError('');
    if (u.active) {
      setConfirmConfig({
        isOpen: true,
        title: 'Desativar Usuário',
        message: \`Tem certeza que deseja desativar o acesso de \${u.name}?\`,
        onConfirm: async () => {
          setConfirmConfig(null);
          try {
            const { updateDoc } = await import('firebase/firestore');
            const updates = { active: false, updatedAt: Date.now() };
            if (u.isPendingGrant) {
              await updateDoc(doc(db, 'accessGrants', u.id), updates);
            } else {
              await updateDoc(doc(db, 'users', u.id), updates);
            }
            fetchUsers();
          } catch (e: any) {
            setActionError(e.message || 'Erro ao desativar usuário');
          }
        }
      });
      return;
    }`
);

code = code.replace(
  /<\/div>\s*\n\s*<\/div>\s*\n\s*\);\s*\n\s*\}\s*\n\s*function UserModal/,
  `    </div>
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}

function UserModal`
);

fs.writeFileSync('src/pages/Users.tsx', code);
