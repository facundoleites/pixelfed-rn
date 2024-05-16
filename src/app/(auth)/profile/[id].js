import { FlatList, Dimensions, ActivityIndicator } from 'react-native'
import { Image, Text, View, YStack } from 'tamagui'
import ProfileHeader from '@components/profile/ProfileHeader'
import { Storage } from 'src/state/cache'
import { queryApi } from 'src/requests'
import { useState, useEffect, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, Link } from 'expo-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getAccountById, getAccountStatusesById, getAccountRelationship } from 'src/lib/api'

const SCREEN_WIDTH = Dimensions.get('screen').width

export default function ProfileScreen() {
  const { id } = useLocalSearchParams()

  const RenderItem = useCallback(({ item }) =>
    item && item.media_attachments && item.media_attachments[0].url ? (
      <Link href={`/post/${item.id}`} asChild>
        <View flexShrink={1} style={{ borderWidth: 1, borderColor: 'white' }}>
          <Image
            source={{
              uri: item.media_attachments[0].url,
              width: SCREEN_WIDTH / 3 - 2,
              height: 140,
            }}
            resizeMode="cover"
          />
        </View>
      </Link>
    ) : null, [])

  const { data: user } = useQuery({
    queryKey: ['profileById', id],
    queryFn: getAccountById,
  })

  const userId = user?.id

  const { data: relationship } = useQuery({
    queryKey: ['getAccountRelationship', id],
    queryFn: getAccountRelationship,
    enabled: !!userId
  })
  const RenderHeader = useCallback(() => 
    <ProfileHeader profile={user} relationship={relationship} />
  ,[user, relationship])

  const {
    status,
    fetchStatus,
    data: feed,
    fetchNextPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetching,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['statusesById', userId],
    queryFn: async ({ pageParam }) => {
      const data = await getAccountStatusesById(userId, pageParam)
      return data.filter((p) => {
        return p.pf_type == 'photo' && p.media_attachments.length
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined
      }
      let lowestId = lastPage.reduce((min, obj) => {
        if (obj.id < min) {
          return obj.id
        }
        return min
      }, lastPage[0].id)
      return lowestId
    },
    enabled: !!userId,
  })

  // if (isFetching && !isFetchingNextPage) {
  //   return (
  //     <SafeAreaView edges={['top']}>
  //       <Stack.Screen options={{ headerShown: false }} />
  //       <ActivityIndicator color={'#000'} />
  //     </SafeAreaView>
  //   )
  // }

  return (
    <SafeAreaView edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={feed?.pages.flatMap((page) => page)}
        keyExtractor={(item, index) => item?.id.toString()}
        ListHeaderComponent={RenderHeader}
        renderItem={RenderItem}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!isFetching && hasNextPage) fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingNextPage ? (
            <View p="$5">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
