#pragma once
#include <string>
#include <map>
#include <functional>
#include <nlohmann/json.hpp>

typedef long HRESULT;
struct ICoreWebView2;
struct ICoreWebView2WebMessageReceivedEventArgs;

class UxBridge
{
public:
	typedef std::function<void(const nlohmann::json& json)> WebViewCallback;

private:
	std::map<std::string, WebViewCallback> callbacks;
	int64_t token;

	HRESULT OnWebMessage(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args);

public:
	UxBridge();
	~UxBridge();

	bool Initialize();
	void Shutdown();

	void RegisterHandler(const std::string& id, const WebViewCallback& callback);
	void Send(const std::string_view& id, nlohmann::json& obj);
};
