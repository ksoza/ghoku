// lib/agents/tools/youtube-tools.ts
// Tool: YouTube Data API v3 — Trending, search, channel analytics, video stats

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  description: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  publishedAt: string;
  duration: string;
  tags: string[];
  categoryId: string;
  thumbnail: string;
}

export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  publishedAt: string;
  thumbnail: string;
}

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string {
  return process.env.YOUTUBE_API_KEY || '';
}

async function youtubeGet(endpoint: string, params: Record<string, string>): Promise<any> {
  const key = getApiKey();
  if (!key) throw new Error('YOUTUBE_API_KEY not configured');
  const url = `${YOUTUBE_API}${endpoint}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

export async function searchYouTubeVideos(
  query: string,
  options: { maxResults?: number; order?: string; videoDuration?: string } = {},
): Promise<YouTubeVideo[]> {
  const { maxResults = 10, order = 'relevance', videoDuration = 'short' } = options;

  const searchRes = await youtubeGet('/search', {
    part: 'snippet',
    q: query,
    type: 'video',
    order,
    videoDuration,
    maxResults: String(maxResults),
    fields: 'items(snippet,id(videoId))',
  });

  if (!searchRes.items?.length) return [];

  const videoIds = searchRes.items.map((i: any) => i.id.videoId).join(',');
  const statsRes = await youtubeGet('/videos', {
    part: 'statistics,contentDetails,snippet',
    id: videoIds,
    fields: 'items(id,snippet(title,description,tags,publishedAt,channelTitle,channelId,categoryId,thumbnails),statistics(viewCount,likeCount,commentCount),contentDetails(duration))',
  });

  return statsRes.items.map((v: any) => ({
    videoId: v.id,
    title: v.snippet.title,
    channelTitle: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    description: v.snippet.description,
    viewCount: v.statistics.viewCount || '0',
    likeCount: v.statistics.likeCount || '0',
    commentCount: v.statistics.commentCount || '0',
    publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails.duration,
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId,
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
  }));
}

export async function getTrendingVideos(
  regionCode = 'US',
  categoryId = '',
  maxResults = 10,
): Promise<YouTubeVideo[]> {
  const params: Record<string, string> = {
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode,
    maxResults: String(maxResults),
    fields: 'items(id,snippet(title,description,publishedAt,channelTitle,channelId,tags,thumbnails),statistics(viewCount,likeCount,commentCount),contentDetails(duration))',
  };
  if (categoryId) params.videoCategoryId = categoryId;

  const res = await youtubeGet('/videos', params);
  return (res.items || []).map((v: any) => ({
    videoId: v.id,
    title: v.snippet.title,
    channelTitle: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    description: v.snippet.description,
    viewCount: v.statistics.viewCount || '0',
    likeCount: v.statistics.likeCount || '0',
    commentCount: v.statistics.commentCount || '0',
    publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails.duration,
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId || '',
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
  }));
}

export async function getChannelStats(channelId: string): Promise<YouTubeChannel> {
  const res = await youtubeGet('/channels', {
    part: 'snippet,statistics,brandingSettings',
    id: channelId,
    fields: 'items(id,snippet(title,description,publishedAt,thumbnails),statistics(subscriberCount,videoCount,viewCount))',
  });
  if (!res.items?.length) throw new Error(`Channel not found: ${channelId}`);
  const c = res.items[0];
  return {
    channelId: c.id,
    title: c.snippet.title,
    description: c.snippet.description,
    subscriberCount: c.statistics.subscriberCount || '0',
    videoCount: c.statistics.videoCount || '0',
    viewCount: c.statistics.viewCount || '0',
    publishedAt: c.snippet.publishedAt,
    thumbnail: c.snippet.thumbnails?.medium?.url || '',
  };
}

export async function getVideoDetails(videoId: string): Promise<YouTubeVideo> {
  const res = await youtubeGet('/videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoId,
    fields: 'items(id,snippet(title,description,tags,publishedAt,channelTitle,channelId,categoryId,thumbnails),statistics(viewCount,likeCount,commentCount),contentDetails(duration))',
  });
  if (!res.items?.length) throw new Error(`Video not found: ${videoId}`);
  const v = res.items[0];
  return {
    videoId: v.id,
    title: v.snippet.title,
    channelTitle: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    description: v.snippet.description,
    viewCount: v.statistics.viewCount || '0',
    likeCount: v.statistics.likeCount || '0',
    commentCount: v.statistics.commentCount || '0',
    publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails.duration,
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId,
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
  };
}

export async function getVideoComments(
  videoId: string,
  maxResults = 20,
): Promise<{ author: string; text: string; likeCount: string; publishedAt: string }[]> {
  const res = await youtubeGet('/commentThreads', {
    part: 'snippet',
    videoId,
    order: 'relevance',
    maxResults: String(maxResults),
    fields: 'items(snippet(topLevelComment(snippet(authorDisplayName,textDisplay,likeCount,publishedAt))))',
  });
  return (res.items || []).map((t: any) => ({
    author: t.snippet.topLevelComment.snippet.authorDisplayName,
    text: t.snippet.topLevelComment.snippet.textDisplay,
    likeCount: t.snippet.topLevelComment.snippet.likeCount || '0',
    publishedAt: t.snippet.topLevelComment.snippet.publishedAt,
  }));
}
