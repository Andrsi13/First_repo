from faker import Faker


fake = Faker()

def get_mocked_user():
    return{
        "name" : fake.name(),
        "last_name" : fake.last_name()

    }


if __name__ == '__main__':
    print("You imported hello.py")
    say_hello('user')