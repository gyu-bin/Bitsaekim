export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      gallery_posts: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          image_url: string
          song_id: string | null
          worship_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          image_url: string
          song_id?: string | null
          worship_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          image_url?: string
          song_id?: string | null
          worship_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_posts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "gallery_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_posts_worship_id_fkey"
            columns: ["worship_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_song_favorites: {
        Row: {
          created_at: string | null
          device_id: string
          song_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          song_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_song_favorites_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "leader_song_favorites_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "gallery_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_items: {
        Row: {
          created_at: string | null
          custom_label: string | null
          id: string
          is_special: boolean | null
          leader_note: string | null
          order_index: number
          song_id: string | null
          worship_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_label?: string | null
          id?: string
          is_special?: boolean | null
          leader_note?: string | null
          order_index: number
          song_id?: string | null
          worship_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_label?: string | null
          id?: string
          is_special?: boolean | null
          leader_note?: string | null
          order_index?: number
          song_id?: string | null
          worship_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_worship_id_fkey"
            columns: ["worship_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string | null
          background_story: string | null
          bible_verse: string | null
          bpm: number | null
          created_at: string | null
          created_by: string | null
          id: string
          lyrics: Json
          song_key: string | null
          title: string
        }
        Insert: {
          artist?: string | null
          background_story?: string | null
          bible_verse?: string | null
          bpm?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lyrics: Json
          song_key?: string | null
          title: string
        }
        Update: {
          artist?: string | null
          background_story?: string | null
          bible_verse?: string | null
          bpm?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lyrics?: Json
          song_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          completed_at: string | null
          device_id: string | null
          id: string
          mode: string | null
          song_id: string | null
          worship_id: string | null
        }
        Insert: {
          completed_at?: string | null
          device_id?: string | null
          id?: string
          mode?: string | null
          song_id?: string | null
          worship_id?: string | null
        }
        Update: {
          completed_at?: string | null
          device_id?: string | null
          id?: string
          mode?: string | null
          song_id?: string | null
          worship_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "transcriptions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_worship_id_fkey"
            columns: ["worship_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          device_id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      worship_services: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          name: string
          service_date: string
          service_time: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          name: string
          service_date: string
          service_time?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          name?: string
          service_date?: string
          service_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worship_services_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["device_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_gathering_for_leader: {
        Args: { p_device_id: string; p_gathering_name: string }
        Returns: {
          created_by: string
          id: string
          invite_code: string
          name: string
        }[]
      }
      get_gathering_owner_for_member: {
        Args: { p_device_id: string; p_gathering_id: string }
        Returns: string
      }
      insert_setlist_song_for_leader: {
        Args: { p_device_id: string; p_song_id: string; p_worship_id: string }
        Returns: string
      }
      insert_song_for_leader: {
        Args: { p_created_by: string; p_lyrics: Json; p_title: string }
        Returns: string
      }
      insert_worship_for_leader:
        | {
            Args: {
              p_creator_id: string
              p_name: string
              p_service_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_creator_id: string
              p_gathering_id: string
              p_name: string
              p_service_date: string
            }
            Returns: string
          }
      join_gathering_by_code: {
        Args: { p_device_id: string; p_invite_code: string }
        Returns: {
          created_by: string
          gathering_id: string
          gathering_name: string
          invite_code: string
        }[]
      }
      leader_favorite_toggle: {
        Args: { p_device_id: string; p_song_id: string }
        Returns: boolean
      }
      leader_favorites_list_ids: {
        Args: { p_device_id: string }
        Returns: {
          song_id: string
        }[]
      }
      record_transcription_for_device: {
        Args: {
          p_device_id: string
          p_mode: string
          p_song_id: string
          p_worship_id: string
        }
        Returns: boolean
      }
      set_config: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      set_user_role: {
        Args: { p_device_id: string; p_role: string }
        Returns: undefined
      }
      setlist_item_note_for_leader: {
        Args: { p_device_id: string; p_item_id: string; p_leader_note: string }
        Returns: undefined
      }
      setlist_reorder_for_leader: {
        Args: {
          p_device_id: string
          p_item_ids: string[]
          p_worship_id: string
        }
        Returns: undefined
      }
      update_user_name_for_device: {
        Args: { p_device_id: string; p_name: string }
        Returns: undefined
      }
      update_worship_for_leader: {
        Args: {
          p_creator_id: string
          p_name: string
          p_service_date: string
          p_worship_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
