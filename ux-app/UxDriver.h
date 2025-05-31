#pragma once
#include <queue>
#include <mutex>
#include <string>
#include <nlohmann/json.hpp>

enum class RxCmd;

class UxDriver
{
private:
	std::queue<std::pair<std::string, nlohmann::json>> txQueue;
	std::optional<std::pair<nlohmann::json, nlohmann::json>> resyncMsg;
	std::mutex txQueueMutex;
	std::queue<std::pair<RxCmd, uint64_t>> rxQueue;
	std::mutex rxQueueMutex;

	void PushTxMessage(const std::string_view& id, nlohmann::json& content);
	void CommitTxMessages();
	void PushRxMessage(RxCmd id, uint64_t value);
	void CommitRxMessages();
	void HandleRxMessages(RxCmd id, uint64_t value);

public:
	UxDriver();
	~UxDriver();

	void Initialize();
};
