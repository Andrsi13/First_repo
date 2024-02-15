
message = "Hello Mr."

def greet(name):

    print(message, name)


def greet2(name):
    random_variables = 14
    message = "Good morning"
    print(locals())
    print(message, name)

def greet3(name):
    global message
    message = "Good morning"
    print(message, name)


greet2("Serhii")
greet3("Serhii")

print(globals())
