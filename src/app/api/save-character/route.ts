import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userProfileService, FinalizedCharacter } from '@/lib/userProfiles'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const characterData: Partial<FinalizedCharacter> = body

    // Get or create user profile using email as identifier
    const userProfile = await userProfileService.getOrCreateUserProfile({
      userId: session.user.email, // Use email as user ID for now
      email: session.user.email,
      name: session.user.name || undefined,
      image: session.user.image || undefined
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 })
    }

    // Save the finalized character
    const savedCharacter = await userProfileService.saveFinalizedCharacter({
      ...characterData,
      user_profile_id: userProfile.id
    })

    if (!savedCharacter) {
      return NextResponse.json({ error: 'Failed to save character' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      character: savedCharacter 
    })

  } catch (error) {
    console.error('Error saving character:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all finalized characters for the user
    const characters = await userProfileService.getFinalizedCharacters(session.user.email)

    return NextResponse.json({ 
      success: true, 
      characters 
    })

  } catch (error) {
    console.error('Error getting characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 