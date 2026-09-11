import re

with open('broken_class.txt', 'r') as f:
    lines = [re.sub(r'^\s*\d+\t', '', line).rstrip('\n') for line in f]

# We need to insert "      }" or "    });" where they belong.
# We will just use my manual mapping, but perfectly.
# Let's list the known missing lines based on context.

out = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 87: closing if (sortedStudents.length > 0)
    if i == 86:
        out.append(line)
        out.append("      }")
        i += 1
        continue
    
    # 92: fetch call headers
    if i == 91 and ');' in line:
        out.append("    });")
        i += 1
        continue
        
    # 138: else {
    if "else {" in line and " } else {" not in line and "      } else {" not in line:
        out.append("      } else {")
        i += 1
        continue
        
    # 146: ); from push
    if line == "  );" and i == 145:
        out.append("        });")
        i += 1
        continue
        
    # 165: catch (err: any) -> before this, try ends.
    # Wait, 165 doesn't have a catch in the original.
    
    out.append(line)
    i += 1

with open('src/pages/ClassEvaluation.tsx', 'w') as f:
    f.write("\n".join(out))

