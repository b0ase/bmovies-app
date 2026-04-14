import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ ok: true, message: 'All HandCash cookies cleared. Go to / to login again.' })
  response.cookies.delete('npgx_handcash_token')
  response.cookies.delete('npgx_user_handle')
  response.cookies.delete('npgx_paid')
  return response
}
