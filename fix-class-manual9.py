import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("          copy.push(data.assessment);\n          return copy;\n      });", "          copy.push(data.assessment);\n        }\n        return copy;\n      });")
content = content.replace("        throw new Error(data.error || 'Erro ao salvar.');", "        throw new Error(data.error || 'Erro ao salvar.');\n      }")
with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
