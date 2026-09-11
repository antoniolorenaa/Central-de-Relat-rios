import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("        return copy;\n);", "        return copy;\n      });")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
