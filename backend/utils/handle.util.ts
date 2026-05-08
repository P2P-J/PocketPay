const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

const validateHandleFormat = (handle: string): boolean => {
  return HANDLE_REGEX.test(handle);
};

module.exports = { validateHandleFormat, HANDLE_REGEX };
