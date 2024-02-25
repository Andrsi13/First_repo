import pathlib

def sanitize_file(source, output):
    sanitized_text = ''
    with open(source, 'r') as fh:
        for line in fh:
            for ch in line:
                if not ch.isdigit():
                    sanitized_text += ch
    with open(output, 'w') as fl:
        fl.write(sanitized_text)

a = 'Module06/source.txt'
b = 'output.txt'

sanitize_file(a,b)
    