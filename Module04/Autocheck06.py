
def game(terra, power):
    for level in terra:
        for pow in level:
            if pow <= power:
                power += pow
            else:
                break
    return power


print(game([[1, 2, 5, 10], [2, 10, 2], [1, 3, 1]], 1))