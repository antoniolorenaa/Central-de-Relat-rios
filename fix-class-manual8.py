import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("          copy.push(data.assessment);\n          return copy;", "          copy.push(data.assessment);\n        }\n        return copy;")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
