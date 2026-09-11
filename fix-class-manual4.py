import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("      return true;  }, [students, assessments, reports, studentFilter]);", "      return true;\n    });\n  }, [students, assessments, reports, studentFilter]);")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
