document.addEventListener('DOMContentLoaded', () => {
  const initiateBtn = document.getElementById('initiateBtn');
  const terminateBtn = document.getElementById('terminateBtn');
  const subjectName = document.getElementById('subjectName');
  const textQueue = document.getElementById('textQueue');
  const delayConfig = document.getElementById('delayConfig');
  const burstModeToggle = document.getElementById('burstModeToggle');
  const textArtModeToggle = document.getElementById('textArtModeToggle');
  const systemLog = document.getElementById('systemLog');
  const statusNotice = document.getElementById('statusNotice');
  const devLink = document.getElementById('devLink');
  const uploadTrigger = document.getElementById('uploadTrigger');
  const fileLoader = document.getElementById('fileLoader');

  // Cloud Allowed Users URL (Raw Text List)
  const CLOUD_AUTH_URL = "https://raw.githubusercontent.com/thedevilondiscord/Kabir-Instagram-Spammer-Extention/refs/heads/main/AllowedUsersKIS";
  let isAuthorized = false;

  let logRotationInterval;
  const standardLogs = [
    "Kabir Discord Ruler Engine active",
    "Ready for queue assignment",
    "Use [Subject] to insert names dynamically",
    "Connected to client interface"
  ];
  let logPointer = 0;

  function cycleSystemLogs() {
    clearInterval(logRotationInterval);
    if (!isAuthorized) return; // Halt text cycling if verification fails
    logRotationInterval = setInterval(() => {
      systemLog.textContent = standardLogs[logPointer];
      logPointer = (logPointer + 1) % standardLogs.length;
    }, 4000);
  }

  function showAlert(msg, isError = false) {
    statusNotice.textContent = msg;
    statusNotice.style.backgroundColor = isError ? '#da373c' : '#23a55a';
    statusNotice.style.display = 'block';
    setTimeout(() => {
      statusNotice.style.display = 'none';
    }, 2500);
  }

  // --- CLOUD AUTHENTICATION CORE ENGINE ---
  async function runCloudVerification() {
    systemLog.textContent = "Checking hardware authorizations...";
    initiateBtn.disabled = true;

    try {
      const response = await fetch(CLOUD_AUTH_URL);
      if (!response.ok) throw new Error("Network validation rejected");
      
      const rawTextData = await response.稳定 || await response.text();
      
      // Parse list splitting by individual lines and removing empty spaces
      const allowedUsers = rawTextData.split('\n')
        .map(user => user.trim())
        .filter(user => user.length > 0);

      // Request username to check against target cloud database file
      const userIdent = localStorage.getItem('kdr_user_identity') || prompt("Enter registered Discord Username for access:");

      if (userIdent && allowedUsers.includes(userIdent)) {
        localStorage.setItem('kdr_user_identity', userIdent);
        isAuthorized = true;
        initiateBtn.disabled = false;
        systemLog.textContent = `Welcome back, ${userIdent}! Engine ready.`;
        cycleSystemLogs();
      } else {
        localStorage.removeItem('kdr_user_identity');
        systemLog.textContent = "❌ Access Terminated: User not found in database.";
        showAlert("Authentication Failed", true);
      }
    } catch (err) {
      systemLog.textContent = "⚠️ Cloud connection timeout. Contact admin.";
      showAlert("Offline Validation Error", true);
    }
  }

  // Execute verification loop immediately on popup draw
  runCloudVerification();

  devLink.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.instagram.com/arjuniscoolll/' });
  });

  uploadTrigger.addEventListener('click', () => {
    if (!isAuthorized) return showAlert("Unlock tool first", true);
    fileLoader.click();
  });

  fileLoader.addEventListener('change', (e) => {
    const targetFile = e.target.files[0];
    if (!targetFile) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      textQueue.value = event.target.result;
      showAlert("📁 File synchronized");
    };
    fileReader.readAsText(targetFile);
  });

  initiateBtn.addEventListener('click', async () => {
    if (!isAuthorized) {
      showAlert("Unauthorized access blocked", true);
      return;
    }

    const rawQueue = textQueue.value;
    const subVal = subjectName.value.trim();

    if (!rawQueue.trim()) {
      showAlert("⚠️ Provide message entries", true);
      return;
    }

    let cleanMessages = [];
    const isTextArtMode = textArtModeToggle.checked;

    if (isTextArtMode) {
      const textArtRegex = /textart\{([\s\S]*?)\}textart/g;
      let match;
      let lastIndex = 0;

      while ((match = textArtRegex.exec(rawQueue)) !== null) {
        const textBefore = rawQueue.substring(lastIndex, match.index).trim();
        if (textBefore) {
          textBefore.split('\n').forEach(line => {
            if (line.trim().length > 0) cleanMessages.push(line.trim());
          });
        }

        const artContent = match[1];
        if (artContent) {
          cleanMessages.push(artContent); 
        }
        lastIndex = textArtRegex.lastIndex;
      }

      const textAfter = rawQueue.substring(lastIndex).trim();
      if (textAfter) {
        textAfter.split('\n').forEach(line => {
          if (line.trim().length > 0) cleanMessages.push(line.trim());
        });
      }
    } else {
      cleanMessages = rawQueue.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }

    if (cleanMessages.length === 0) {
      showAlert("⚠️ Message queue is empty", true);
      return;
    }

    cleanMessages = cleanMessages.map(msg => msg.replaceAll('[Subject]', subVal));
    const calculatedDelay = parseInt(delayConfig.value, 10) || 30;
    const isBurstMode = burstModeToggle.checked;

    initiateBtn.className = "switch-btn btn-running";
    initiateBtn.innerHTML = "🟢 Running";
    clearInterval(logRotationInterval);
    
    systemLog.textContent = isBurstMode 
      ? `Bursting ${cleanMessages.length} items at once...`
      : `Processing list (${cleanMessages.length} items)...`;

    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!currentTab || !currentTab.url.includes("discord.com")) {
      showAlert("⚠️ Move to a Discord tab", true);
      restoreButtons();
      return;
    }

    showAlert("⚡ Engine processing started");

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: runDiscordAutomation,
      args: [cleanMessages, calculatedDelay, isBurstMode]
    });
  });

  terminateBtn.addEventListener('click', async () => {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab) {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: stopDiscordAutomation
      });
    }
    showAlert("🛑 Engine halted", true);
    restoreButtons();
  });

  function restoreButtons() {
    initiateBtn.className = "switch-btn btn-launch";
    initiateBtn.innerHTML = "Run Engine";
    if (isAuthorized) cycleSystemLogs();
  }
});

function runDiscordAutomation(messageArray, delayVal, isBurstMode) {
  if (window.discordRulerTimer) clearInterval(window.discordRulerTimer);
  if (window.discordBurstTimeout) clearTimeout(window.discordBurstTimeout);
  
  window.discordRulerActive = true;

  function executePasteAndSend(content, callback) {
    const textContainer = document.querySelector('div[class*="textArea_"] div[role="textbox"]') || 
                          document.querySelector('div[role="textbox"][contenteditable="true"]');
                     
    if (!textContainer) {
      if (callback) callback();
      return;
    }

    textContainer.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', content);

    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    });

    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    textContainer.dispatchEvent(pasteEvent);

    setTimeout(() => {
      const enterOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
      textContainer.dispatchEvent(new KeyboardEvent('keydown', enterOptions));
      if (callback) callback();
    }, 150);
  }

  if (isBurstMode) {
    let index = 0;
    function sendNextInstant() {
      if (!window.discordRulerActive || index >= messageArray.length) return;
      executePasteAndSend(messageArray[index], () => {
        index++;
        window.discordBurstTimeout = setTimeout(sendNextInstant, 250); 
      });
    }
    sendNextInstant();
  } else {
    let textIndex = 0;
    function transmitNextMessage() {
      if (!window.discordRulerActive) return;
      executePasteAndSend(messageArray[textIndex], () => {
        textIndex = (textIndex + 1) % messageArray.length;
      });
    }
    transmitNextMessage();
    window.discordRulerTimer = setInterval(transmitNextMessage, delayVal * 1000);
  }
}

function stopDiscordAutomation() {
  window.discordRulerActive = false;
  if (window.discordRulerTimer) {
    clearInterval(window.discordRulerTimer);
    window.discordRulerTimer = null;
  }
  if (window.discordBurstTimeout) {
    clearTimeout(window.discordBurstTimeout);
    window.discordBurstTimeout = null;
  }
}
