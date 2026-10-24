// Story art when a post has no image of its own: Westlake photography matched
// to the kind of story. Shared by Alumni News and the Home tab.
const CATEGORY_ART = {
  'Alumni Magazine': '/news/gala.webp',
  Spotlight: '/news/track.webp',
  Events: '/news/stadium.webp',
  'Campus News': '/WHSfield.jpg',
};

export const artFor = (post) => post?.imageUrl || CATEGORY_ART[post?.category] || '/WHSfield.jpg';
