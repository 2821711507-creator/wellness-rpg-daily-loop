const USERNAME_MESSAGE = '아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.'

export function normalizeUsername(value:string) {
  return value.trim().toLowerCase()
}

export function validateUsername(value:string):
  | { ok:true; username:string }
  | { ok:false; message:string } {
  const username = normalizeUsername(value)
  return /^[a-z0-9_]{4,24}$/.test(username)
    ? { ok:true, username }
    : { ok:false, message:USERNAME_MESSAGE }
}
