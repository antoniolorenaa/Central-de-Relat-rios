const fs = require('fs');
let code = fs.readFileSync('src/pages/Matrices.tsx', 'utf8');

// Clean duplicate imports
code = code.replace(/import \{ ConfirmModal \} from '\.\.\/components\/ui\/ConfirmModal';\nimport \{ ConfirmModal \} from '\.\.\/components\/ui\/ConfirmModal';/, "import { ConfirmModal } from '../components/ui/ConfirmModal';");

// Clean duplicate states
code = code.replace(/const \[matrixToDelete, setMatrixToDelete\] = useState<any>\(null\);\n  const \[isDeleting, setIsDeleting\] = useState\(false\);\n  const \[matrixToDelete, setMatrixToDelete\] = useState<Matrix \| null>\(null\);\n  const \[isDeleting, setIsDeleting\] = useState\(false\);/, 
  "const [matrixToDelete, setMatrixToDelete] = useState<Matrix | null>(null);\n  const [isDeleting, setIsDeleting] = useState(false);");

// Clean duplicate delete matrix
code = code.replace(/  const handleDeleteMatrix = async \(\) => \{\n    if \(!matrixToDelete \|\| isDeleting\) return;\n[\s\S]*?setIsDeleting\(false\);\n    \}\n  \};\n\n  const handleDeleteMatrix = async \(\) => \{\n    if \(!matrixToDelete \|\| isDeleting\) return;/, 
  "  const handleDeleteMatrix = async () => {\n    if (!matrixToDelete || isDeleting) return;");

fs.writeFileSync('src/pages/Matrices.tsx', code);
