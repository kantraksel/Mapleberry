#pragma once
#include <queue>
#include <mutex>
#include <string>
#include <nlohmann/json.hpp>

class UxDriver
{
private:
	std::queue<std::pair<std::string, nlohmann::json>> msgQueue;
	std::mutex msgQueueMutex;

	void PushMessage(const std::string_view& id, nlohmann::json& content);
	void CommitMessages();

public:
	UxDriver();
	~UxDriver();

	void Initialize();
};
