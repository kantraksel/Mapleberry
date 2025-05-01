#pragma once
#include <future>
#include <memory>
#include <chrono>

template <typename T>
struct Future
{
	using Object = std::future<T>;
	Object obj;

	Future() = default;

	Future(Object&& obj) : obj(std::move(obj))
	{
	}

	bool is_ready()
	{
		using namespace std::chrono_literals;
		return obj.wait_for(0s) == std::future_status::ready;
	}

	T get()
	{
		return obj.get();
	}
};

template <>
struct Future<void>
{
	using Object = std::future<void>;
	Object obj;

	Future() = default;

	Future(Object&& obj) : obj(std::move(obj))
	{
	}

	bool is_ready()
	{
		using namespace std::chrono_literals;
		return obj.wait_for(0s) == std::future_status::ready;
	}

	void get()
	{
		obj.get();
	}
};

template <typename T>
struct FuturePtr
{
	using Object = Future<T>;
	using ObjectPtr = std::shared_ptr<Object>;
	ObjectPtr ptr;

	FuturePtr() = default;

	explicit FuturePtr(Object&& obj) :
		ptr(std::make_shared<Object>(std::move(obj)))
	{
	}

	Object& operator*() const noexcept
	{
		return *ptr;
	}

	constexpr Object* operator->() const noexcept
	{
		return std::addressof(*ptr);
	}

	operator bool() const noexcept
	{
		return ptr.use_count() > 0;
	}
};

template <typename T, typename... Args>
inline auto MakeFuturePtr(Args&& ...args)
{
	return FuturePtr(Future<T>(args...));
}

template <typename T>
struct Promise
{
	std::promise<T> obj;

	Promise() = default;

	Future<T> get_future()
	{
		return obj.get_future();
	}

	void set_value(const T& value)
	{
		obj.set_value(value);
	}

	void set_exception(std::exception_ptr ptr)
	{
		obj.set_exception(ptr);
	}

	void set_new_exception(const char* msg)
	{
		obj.set_exception(std::make_exception_ptr(std::exception(msg)));
	}

	void set_current_exception()
	{
		obj.set_exception(std::current_exception());
	}
};

template <>
struct Promise<void>
{
	std::promise<void> obj;

	Promise() = default;

	Future<void> get_future()
	{
		return obj.get_future();
	}

	void set_value()
	{
		obj.set_value();
	}

	void set_exception(std::exception_ptr ptr)
	{
		obj.set_exception(ptr);
	}

	void set_new_exception(const char* msg)
	{
		obj.set_exception(std::make_exception_ptr(std::exception(msg)));
	}

	void set_current_exception()
	{
		obj.set_exception(std::current_exception());
	}
};

template <typename T>
struct PromisePtr
{
	using Object = Promise<T>;
	using ObjectPtr = std::shared_ptr<Object>;
	ObjectPtr ptr;

	PromisePtr() = default;

	explicit PromisePtr(Object&& obj) :
		ptr(std::make_shared<Object>(std::move(obj)))
	{
	}

	Object& operator*() const noexcept
	{
		return *ptr;
	}

	constexpr Object* operator->() const noexcept
	{
		return std::addressof(*ptr);
	}

	operator bool() const noexcept
	{
		return ptr.use_count() > 0;
	}
};

template <typename T, typename... Args>
inline auto MakePromisePtr(Args&& ...args)
{
	return PromisePtr(Promise<T>(args...));
}
