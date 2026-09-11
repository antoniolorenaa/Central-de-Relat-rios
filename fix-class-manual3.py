import re

with open('src/pages/ClassEvaluation.tsx', 'r') as f:
    content = f.read()

# Since I just can't fix it properly through these regex scripts over an already corrupted file,
# I will use prettier to try to format it, maybe it fixes some issues, but probably not.
