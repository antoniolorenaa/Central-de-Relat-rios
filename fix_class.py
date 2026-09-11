import re

with open('broken_class.txt', 'r') as f:
    lines = [re.sub(r'^\s*\d+\t', '', line).rstrip('\n') for line in f]

# We need to insert "      }" or "    });" where they belong.

out = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # fix 86: missing }
    if "setSelectedStudentId(sortedStudents[0].id);" in line:
        out.append(line)
        out.append("      }")
        i += 1
        continue
    
    # fix 91: fetch fetch(`/api/academic/classes/${classId}/evaluation-data?period=${period}`
    if "headers: { 'Authorization': `Bearer ${token}` } );" in line:
        out.append("        headers: { 'Authorization': `Bearer ${token}` } });")
        i += 1
        continue
        
    # fix 138: else {
    if line == " else {":
        out.append("      } else {")
        i += 1
        continue
        
    # fix 146: push close
    if line == "  );" and "matrixId: currentMatrix.id" in lines[i-1]:
        out.append("        });")
        i += 1
        continue
        
    # fix 149: close setAssessments
    if i == 149 and line == "":
        out.append("    });")
        i += 1
        continue

    # fix 158: JSON stringify start
    if line == "  ,":
        out.append("        },")
        i += 1
        continue
        
    # fix 167: JSON stringify end
    if line == "  )":
        out.append("        })")
        i += 1
        continue

    # fix 168: fetch end
    if line == ");" and lines[i-1].strip() == "})":
        out.append("      });")
        i += 1
        continue

    # fix 257: similar push close
    if line == "  );" and "matrixId: currentMatrix.id" in lines[i-1]:
        out.append("        });")
        i += 1
        continue

    out.append(line)
    i += 1

with open('temp_class2.tsx', 'w') as f:
    f.write("\n".join(out))
