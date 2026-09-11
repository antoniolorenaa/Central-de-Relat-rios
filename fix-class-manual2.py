import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

# Fix the two click handler brackets that are broken
content = content.replace("if (idx > 0) setSelectedStudentId(filteredStudents[idx - 1].id);                }", "if (idx > 0) setSelectedStudentId(filteredStudents[idx - 1].id);\n                      }")
content = content.replace("if (idx < filteredStudents.length - 1) setSelectedStudentId(filteredStudents[idx + 1].id);                }", "if (idx < filteredStudents.length - 1) setSelectedStudentId(filteredStudents[idx + 1].id);\n                      }")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
