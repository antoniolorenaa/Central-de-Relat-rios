import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("          copy[idx] = data.assessment;\n   else {", "          copy[idx] = data.assessment;\n        } else {")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
