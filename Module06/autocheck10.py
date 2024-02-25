import shutil


def create_backup(path, file_name, employee_residence):
    lines = []
    for key, value in employee_residence.items():
        line = f'{key} {value}' 
        line.encode()
        lines.append(line.encode())
    
    with open(f'{path}/{file_name}', 'wb') as file_name:
        for line in lines:
            file_name.write(line + b'\n')
    
    archive_name = shutil.make_archive('backup_folder', 'zip', path)
    return archive_name