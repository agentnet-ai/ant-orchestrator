let latestInquiry = null;

function setLatestInquiry(obj) {
  if (!obj || typeof obj !== "object") return;
  latestInquiry = {
    ...obj,
    updatedAt: obj.updatedAt || new Date().toISOString(),
  };
}

function getLatestInquiry() {
  return latestInquiry;
}

module.exports = {
  setLatestInquiry,
  getLatestInquiry,
};
