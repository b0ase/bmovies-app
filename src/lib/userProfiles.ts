import { supabase } from './supabase'

export interface UserProfile {
  id: string
  user_id: string
  email: string
  display_name: string
  username: string
  avatar_url?: string
  bio?: string
  member_since: string
  subscription_plan: 'free' | 'pro' | 'premium'
  total_earnings: number
  monthly_revenue: number
  total_followers: number
  npgx_characters_count: number
  content_created_count: number
  platforms_connected: number
  is_verified: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AIGirlfriend {
  id: string
  user_profile_id: string
  name: string
  image_url?: string
  monthly_earnings: number
  followers: number
  content_count: number
  status: 'active' | 'paused' | 'archived'
  platforms: string[]
  personality_traits: string[]
  token_symbol?: string
  token_price: number
  created_at: string
  updated_at: string
}

export interface UserEarning {
  id: string
  user_profile_id: string
  ai_girlfriend_id?: string
  platform: string
  amount: number
  currency: string
  transaction_type: 'subscription' | 'tip' | 'content_sale' | 'advertising'
  transaction_date: string
  description?: string
  created_at: string
}

// Add interface for finalized NPGX characters
export interface FinalizedCharacter {
  id: string
  user_profile_id: string
  name: string
  codename: string
  image_url?: string
  attributes: {
    eyes: string
    hair: string
    height: string
    build: string
    skinTone: string
    tattoos: string
    clothingStyle: string
    personality: string
    backstory: string
    specialAbilities: string
    goals: string
    fears: string
    quirks: string
  }
  development?: {
    personality: string
    backstory: string
    specialAbilities: string
    goals: string
    fears: string
    quirks: string
    relationships: string
    catchphrase: string
  }
  generated_images: { [key: string]: string }
  generated_prompts: { [key: string]: string }
  slug: string
  status: 'active' | 'draft' | 'archived'
  monthly_earnings: number
  followers: number
  content_count: number
  platforms: string[]
  created_at: string
  updated_at: string
}

class UserProfileService {
  // Get user profile by user_id (NextAuth ID)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) {
      console.warn('Supabase not configured - using localStorage fallback')
      return this.getProfileFromLocalStorage(userId)
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return this.getProfileFromLocalStorage(userId)
    }
  }

  // Get user profile by email
  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile by email:', error)
      return null
    }
  }

  // Create a new user profile
  async createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: profileData.user_id,
          email: profileData.email,
          display_name: profileData.display_name || 'AI Creator',
          username: profileData.username || '@creator',
          avatar_url: profileData.avatar_url,
          bio: profileData.bio,
          subscription_plan: profileData.subscription_plan || 'free',
          settings: profileData.settings || {}
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      return null
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!supabase) {
      console.warn('Supabase not configured - using localStorage fallback')
      return this.updateProfileInLocalStorage(userId, updates)
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Also save to localStorage as backup
      this.saveProfileToLocalStorage(data)
      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      return this.updateProfileInLocalStorage(userId, updates)
    }
  }

  // Get user's NPGX characters
  async getUserNPGXCharacters(userId: string): Promise<AIGirlfriend[]> {
    if (!supabase) return []
    try {
      const { data, error } = await supabase
        .from('user_ai_girlfriends')
        .select('*')
        .eq('user_profile_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
              console.error('Error fetching NPGX characters:', error)
      return []
    }
  }

  // Create new AI girlfriend
  async createAIGirlfriend(aiGirlfriendData: Partial<AIGirlfriend>): Promise<AIGirlfriend | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('user_ai_girlfriends')
        .insert([aiGirlfriendData])
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error creating AI girlfriend:', error)
      return null
    }
  }

  // Save finalized NPGX character to user profile
  async saveFinalizedCharacter(characterData: Partial<FinalizedCharacter>): Promise<FinalizedCharacter | null> {
    if (!supabase) {
      console.warn('Supabase not configured - cannot save finalized character')
      return null
    }

    try {
      // Generate a slug from the character name
      const slug = characterData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
      
      const { data, error } = await supabase
        .from('user_npgx_characters')
        .insert([{
          ...characterData,
          slug,
          status: 'active',
          monthly_earnings: 0,
          followers: 0,
          content_count: 0,
          platforms: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error saving finalized character:', error)
      return null
    }
  }

  // Get all finalized characters for a user
  async getFinalizedCharacters(userId: string): Promise<FinalizedCharacter[]> {
    if (!supabase) {
      console.warn('Supabase not configured - cannot get finalized characters')
      return []
    }

    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!userProfile) {
        return []
      }

      const { data, error } = await supabase
        .from('user_npgx_characters')
        .select('*')
        .eq('user_profile_id', userProfile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error getting finalized characters:', error)
      return []
    }
  }

  // Get a specific finalized character by slug
  async getFinalizedCharacterBySlug(userId: string, slug: string): Promise<FinalizedCharacter | null> {
    if (!supabase) {
      console.warn('Supabase not configured - cannot get finalized character')
      return null
    }

    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!userProfile) {
        return null
      }

      const { data, error } = await supabase
        .from('user_npgx_characters')
        .select('*')
        .eq('user_profile_id', userProfile.id)
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting finalized character by slug:', error)
      return null
    }
  }

  // Update finalized character
  async updateFinalizedCharacter(characterId: string, updates: Partial<FinalizedCharacter>): Promise<FinalizedCharacter | null> {
    if (!supabase) {
      console.warn('Supabase not configured - cannot update finalized character')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('user_npgx_characters')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', characterId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error updating finalized character:', error)
      return null
    }
  }

  // Get user earnings
  async getUserEarnings(userId: string, limit = 100): Promise<UserEarning[]> {
    if (!supabase) return []
    try {
      const { data, error } = await supabase
        .from('user_earnings')
        .select(`
          *,
          ai_girlfriend:user_ai_girlfriends(name, image_url)
        `)
        .eq('user_profile_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user earnings:', error)
      return []
    }
  }

  // Add earning record
  async addEarning(earningData: Partial<UserEarning>): Promise<UserEarning | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('user_earnings')
        .insert([earningData])
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error adding earning record:', error)
      return null
    }
  }

  // Get or create user profile (for new users)
  async getOrCreateUserProfile(userData: {
    userId: string
    email: string
    name?: string
    image?: string
  }): Promise<UserProfile | null> {
    try {
      // First try to get existing profile
      let profile = await this.getUserProfile(userData.userId)
      
      if (!profile) {
        // Create new profile if doesn't exist
        const username = this.generateUsername(userData.name || userData.email)
        
        const newProfile: UserProfile = {
          id: this.generateId(),
          user_id: userData.userId,
          email: userData.email,
          display_name: userData.name || 'b0ase',
          username: username,
          avatar_url: userData.image,
          bio: '',
          member_since: new Date().toISOString(),
          subscription_plan: 'pro',
          total_earnings: 47230,
          monthly_revenue: 12450,
          total_followers: 284000,
          npgx_characters_count: 3,
          content_created_count: 156,
          platforms_connected: 4,
          is_verified: false,
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .insert([newProfile])
              .select()
              .single()

            if (!error && data) {
              this.saveProfileToLocalStorage(data)
              return data
            }
          } catch (error) {
            console.error('Error creating profile in Supabase:', error)
          }
        }

        // Fallback to localStorage
        this.saveProfileToLocalStorage(newProfile)
        profile = newProfile
      }

      return profile
    } catch (error) {
      console.error('Error getting or creating user profile:', error)
      return null
    }
  }

  // Check if username is available
  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    if (!supabase) {
      // For localStorage fallback, just check if it's different from current
      return true
    }

    try {
      let query = supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.startsWith('@') ? username : `@${username}`)

      if (currentUserId) {
        query = query.neq('user_id', currentUserId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return !data || data.length === 0
    } catch (error) {
      console.error('Error checking username availability:', error)
      return false
    }
  }

  // Fallback methods for localStorage when Supabase isn't configured
  private getProfileFromLocalStorage(userId: string): UserProfile | null {
    try {
      const savedProfile = localStorage.getItem(`user_profile_${userId}`)
      if (savedProfile) {
        return JSON.parse(savedProfile)
      }
      return null
    } catch {
      return null
    }
  }

  private saveProfileToLocalStorage(profile: UserProfile): void {
    try {
      localStorage.setItem(`user_profile_${profile.user_id}`, JSON.stringify(profile))
    } catch (error) {
      console.error('Error saving profile to localStorage:', error)
    }
  }

  private updateProfileInLocalStorage(userId: string, updates: Partial<UserProfile>): UserProfile | null {
    try {
      const existingProfile = this.getProfileFromLocalStorage(userId)
      if (!existingProfile) return null

      const updatedProfile = {
        ...existingProfile,
        ...updates,
        updated_at: new Date().toISOString()
      }

      this.saveProfileToLocalStorage(updatedProfile)
      return updatedProfile
    } catch (error) {
      console.error('Error updating profile in localStorage:', error)
      return null
    }
  }

  // Generate unique username
  private generateUsername(name: string): string {
    const baseUsername = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8)
    
    const randomSuffix = Math.random().toString(36).substring(2, 4)
    return `@${baseUsername || 'user'}${randomSuffix}`
  }

  // Generate a simple ID for localStorage
  private generateId(): string {
    return 'profile_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
  }


}

export const userProfileService = new UserProfileService()
export default userProfileService 