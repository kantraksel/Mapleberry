#pragma once
#include <queue>
#include <mutex>
#include <optional>
#include "Utils/FixedArray.h"

enum class RxCmd;

class WebDriver
{
private:
	std::optional<std::pair<FixedArrayCharS, FixedArrayCharS>> resyncMsg;
	std::queue<std::pair<RxCmd, uint64_t>> rxQueue;
	std::mutex rxQueueMutex;

	void PushRxMessage(RxCmd id, uint64_t value);
	void CommitRxMessages();
	void HandleRxMessages(RxCmd id, uint64_t value);

public:
	WebDriver();
	~WebDriver();

	void Initialize();
};
