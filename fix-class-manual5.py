import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("        headers: { 'Authorization': `Bearer ${token}` }\n      });\n);", "        headers: { 'Authorization': `Bearer ${token}` }\n      });")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
