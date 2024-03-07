def caching_fibonacci():
    cache = {0: 0, 1: 1}

    def fibonacci(n):
        if n in cache:
            print(f"{n} is in cache: {cache.get(n)}")
            print(f"Cache {cache}")
            return cache.get(n)
        print("fibonacci(n - 1) + fibonacci(n - 2)")
        print(f"fibonacci({n - 1}) + fibonacci({n - 2})")
        result = fibonacci(n - 1) + fibonacci(n - 2)
        print(f"fibonacci({n - 1}) + fibonacci({n - 2}) = {result}")
        cache.update({n: result})
        print(f"Cache {cache}")
        return result

    return fibonacci


caching = caching_fibonacci()
print(caching(6))
