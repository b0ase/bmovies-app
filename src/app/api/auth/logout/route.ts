import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('npgx_handcash_token')
  response.cookies.delete('npgx_user_handle')
  return response
}
