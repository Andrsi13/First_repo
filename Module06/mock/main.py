from mock import get_mocked_user
from pprint import pprint
import json


amoumt = int(input("How many fakes users >>> "))

users = list()

for _ in range(amoumt):
    users.append(get_mocked_user())

with open("users.json", "w") as f:
    text = json.dumps(users)
    f.writelines(text)