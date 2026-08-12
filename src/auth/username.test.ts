import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateUsername } from './username'

describe('username', () => {
  it('normalizes whitespace and letter case', () => {
    expect(normalizeUsername('  Runner_01 ')).toBe('runner_01')
  })

  it.each(['abc', '한글이름', 'space name', 'a'.repeat(25)])('rejects invalid username %s', value => {
    expect(validateUsername(value)).toEqual({
      ok:false,
      message:'아이디는 영문 소문자, 숫자, 밑줄로 4~24자여야 해요.',
    })
  })

  it('returns the normalized username when valid', () => {
    expect(validateUsername(' Runner_01 ')).toEqual({ ok:true, username:'runner_01' })
  })
})
