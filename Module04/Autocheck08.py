def is_valid_password(password):
    if len(password) < 8:
        return False
    if not any(ch.isupper() for ch in password):
        return False
    if not any(ch.islower() for ch in password):
        return False
    if not any(ch.isdigit() == True for ch in password): 
        return False
    return True
    
    


print(is_valid_password("aaa3aaaaAaa"))