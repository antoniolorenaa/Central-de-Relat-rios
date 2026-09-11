import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

content = content.replace("        } else {\n          copy.push(data.assessment);\n          return copy;\n      });", "        } else {\n          copy.push(data.assessment);\n        }\n        return copy;\n      });")

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write(content)
