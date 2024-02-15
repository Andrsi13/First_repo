username = input("Enter your username:  ")
password = input("Enter your password:  ")



if "admin" in username:
    if password == "qwerty":
        print(f"login success {username}!")
    elif password == "12345":
        print("weak passowrd")
    else:
        print("incorrect password")
elif "guest" in username:
    if password == "guest123":
        print(f"login success {username}!")
    elif password == "12345":
        print("weak passowrd")
    else:
        print("incorrect password")
else:
    print("only guest and admin allowed!")