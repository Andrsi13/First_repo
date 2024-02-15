from pathlib import Path
p = Path('/Users/avlady/Desktop/GIT_Repo/First_repo/Module04')
def parse_folder(path):
    files = []
    folders = []
    all = []
    for i in path.iterdir():
        all.append(i)
    for o in all:
        if o.is_file():
            files.append(o.name)
        else:
            folders.append(o.name)
        
            
        
            
    return files, folders

print(parse_folder(p))