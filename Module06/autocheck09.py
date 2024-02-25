def get_credentials_users(path):
    lines = []
    with open(path, 'rb') as fh:
        for line in fh.readlines():
            lines.append(line.decode().strip())
    return lines
