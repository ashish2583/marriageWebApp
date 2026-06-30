import {addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where} from 'firebase/firestore';
import {ArrowLeft, MessageCircleMore, Send} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Button, Empty, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {firestoreDb} from '../../lib/firebase';
import {userIdOf} from '../../lib/dataHelpers';

const ADMIN_USER = {id: 'ADMIN', name: 'Admin Support', role: 'admin', image: ''};

const chatTypes = {
  customer_admin: 'Customer with Admin',
  admin_vendor: 'Admin with Vendor',
  vendor_customer: 'Vendor with Customer',
};

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const getUserName = user => firstValue(user?.name, user?.fullName, user?.customerName, user?.vendorName, user?.businessName, user?.email, 'User');
const getUserImage = user => firstValue(user?.profileImage, user?.image, user?.customerImage, user?.vendorImage, user?.avatar, '');
const buildChatId = (firstId, secondId) => [String(firstId), String(secondId)].sort().join('__');
const normalizeDate = value => value?.toDate ? value.toDate() : value ? new Date(value) : new Date();
const formatTime = value => normalizeDate(value).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
const normalizeParticipant = item => ({
  id: String(item?.id || item?.targetId || ''),
  name: item?.name || item?.targetName || 'User',
  role: item?.role || item?.targetRole || 'customer',
  image: item?.image || item?.targetImage || '',
});
const normalizeRoom = snap => {
  const data = snap.data() || {};
  return {
    id: snap.id,
    type: data.type || 'customer_admin',
    title: data.title || '',
    lastMessage: data.lastMessage || '',
    updatedAt: normalizeDate(data.updatedAt || data.createdAt),
    participants: Array.isArray(data.participants) ? data.participants.map(normalizeParticipant) : [],
  };
};
const normalizeMessage = snap => {
  const data = snap.data() || {};
  return {
    id: snap.id,
    text: data.text || '',
    sendBy: String(data.sendBy || ''),
    sendTo: String(data.sendTo || ''),
    createdAt: normalizeDate(data.createdAt),
  };
};
const getOtherParticipant = (room, currentUserId) => room?.participants?.find(item => item.id !== currentUserId) || ADMIN_USER;
const getRoomTitle = (room, currentUserId) => room?.title || getOtherParticipant(room, currentUserId)?.name || 'Chat';
const getRoomSubtitle = room => chatTypes[room?.type] || 'Conversation';

function Avatar({person}) {
  const name = person?.name || 'User';
  return <div className="chat-avatar">{person?.image ? <img src={person.image} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}</div>;
}

export default function ChatPage({role: routeRole = 'customer'}) {
  const {session, notify} = useApp();
  const location = useLocation();
  const role = routeRole || session.user.role || 'customer';
  const currentUserId = role === 'admin' ? ADMIN_USER.id : String(userIdOf(session.user) || '');
  const currentUser = useMemo(() => role === 'admin' ? ADMIN_USER : {
    id: currentUserId,
    name: getUserName(session.user),
    role,
    image: getUserImage(session.user),
  }, [currentUserId, role, session.user]);
  const startChat = location.state?.startChat;
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const adminQuickRoom = useMemo(() => ({
    id: buildChatId(currentUserId, ADMIN_USER.id),
    type: role === 'vendor' ? 'admin_vendor' : 'customer_admin',
    participants: [currentUser, ADMIN_USER],
    lastMessage: '',
    updatedAt: new Date(),
  }), [currentUser, currentUserId, role]);

  const upsertRoom = useCallback(async room => {
    const cleanRoom = {
      ...room,
      participants: room.participants.map(normalizeParticipant),
    };
    await setDoc(doc(firestoreDb, 'chatrooms', cleanRoom.id), {
      type: cleanRoom.type,
      title: cleanRoom.title || '',
      participantIds: cleanRoom.participants.map(item => item.id),
      participantRoles: cleanRoom.participants.map(item => item.role),
      participants: cleanRoom.participants,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, {merge: true});
    return cleanRoom;
  }, []);

  const openRoom = useCallback(async room => {
    if (!currentUserId) return notify('User id not found. Please login again.', 'error');
    try {
      setActiveRoom(await upsertRoom(room));
    } catch (error) {
      notify(error.message || 'Chat not available.', 'error');
    }
  }, [currentUserId, notify, upsertRoom]);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      notify('User id not found. Please login again.', 'error');
      return undefined;
    }
    setLoading(true);
    const roomsQuery = query(collection(firestoreDb, 'chatrooms'), where('participantIds', 'array-contains', currentUserId));
    return onSnapshot(roomsQuery, snapshot => {
      setRooms(snapshot.docs.map(normalizeRoom).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
      setLoading(false);
    }, error => {
      setLoading(false);
      notify(error.message || 'Chats not available right now.', 'error');
    });
  }, [currentUserId, notify]);

  useEffect(() => {
    if (!startChat?.targetId || !currentUserId) return;
    const target = normalizeParticipant(startChat);
    openRoom({
      id: buildChatId(currentUserId, target.id),
      type: startChat.type || 'vendor_customer',
      participants: [currentUser, target],
      title: startChat.title || target.name,
      lastMessage: '',
      updatedAt: new Date(),
    });
  }, [currentUser, currentUserId, openRoom, startChat]);

  useEffect(() => {
    if (!activeRoom?.id) {
      setMessages([]);
      return undefined;
    }
    const messagesQuery = query(collection(firestoreDb, 'chatrooms', activeRoom.id, 'messages'), orderBy('createdAt', 'desc'));
    return onSnapshot(messagesQuery, snapshot => {
      setMessages(snapshot.docs.map(normalizeMessage));
    }, error => notify(error.message || 'Messages not available.', 'error'));
  }, [activeRoom?.id, notify]);

  const sendMessage = async event => {
    event.preventDefault();
    const text = inputText.trim();
    if (!text || !activeRoom?.id || sending) return;
    const other = getOtherParticipant(activeRoom, currentUserId);
    setInputText('');
    setSending(true);
    try {
      await upsertRoom(activeRoom);
      await addDoc(collection(firestoreDb, 'chatrooms', activeRoom.id, 'messages'), {
        text,
        sendBy: currentUserId,
        sendTo: other.id,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(firestoreDb, 'chatrooms', activeRoom.id), {
        lastMessage: text,
        lastMessageBy: currentUserId,
        updatedAt: serverTimestamp(),
      }, {merge: true});
    } catch (error) {
      notify(error.message || 'Message not sent.', 'error');
    } finally {
      setSending(false);
    }
  };

  const renderInbox = () => <div className="chat-layout">
    <section className="chat-room-list">
      {role !== 'admin' && <button type="button" className="chat-quick-card" onClick={() => openRoom(adminQuickRoom)}><Avatar person={ADMIN_USER} /><div><strong>Admin Support</strong><span>Chat with admin for booking and payment help.</span></div></button>}
      {rooms.map(room => {const other = getOtherParticipant(room, currentUserId); return <button type="button" className="chat-room-card" key={room.id} onClick={() => openRoom(room)}><Avatar person={other} /><div><header><strong>{getRoomTitle(room, currentUserId)}</strong><time>{formatTime(room.updatedAt)}</time></header><span>{getRoomSubtitle(room)}</span><p>{room.lastMessage || 'Tap to start chat'}</p></div></button>;})}
      {!loading && !rooms.length && <Empty title="No chats yet" text={role === 'admin' ? 'Customer and vendor conversations will appear here.' : 'Start a chat with admin or open a booking contact.'} />}
    </section>
    <aside className="chat-empty-panel"><MessageCircleMore /><h2>Chats</h2><p>Select a conversation or start a support chat.</p></aside>
  </div>;

  const renderThread = () => {
    const other = getOtherParticipant(activeRoom, currentUserId);
    return <div className="chat-thread">
      <header className="chat-thread-header"><button type="button" onClick={() => setActiveRoom(null)}><ArrowLeft /></button><Avatar person={other} /><div><strong>{getRoomTitle(activeRoom, currentUserId)}</strong><span>{getRoomSubtitle(activeRoom)}</span></div></header>
      <div className="chat-message-list">{messages.length ? messages.map(message => {const mine = message.sendBy === currentUserId; return <div className={`chat-message-row ${mine ? 'mine' : ''}`} key={message.id}><div className="chat-message-bubble"><p>{message.text}</p><time>{formatTime(message.createdAt)}</time></div></div>;}) : <Empty title="Say hello" text="Send the first message." />}</div>
      <form className="chat-input-bar" onSubmit={sendMessage}><textarea value={inputText} onChange={event => setInputText(event.target.value)} placeholder="Type message" rows={1} /><Button disabled={!inputText.trim() || sending}>{sending ? 'Sending...' : <><Send size={17} />Send</>}</Button></form>
    </div>;
  };

  return <div className="page chat-page"><PageHeader eyebrow="Messages" title={activeRoom ? 'Chat' : role === 'admin' ? 'Admin Chat' : role === 'vendor' ? 'Vendor Chat' : 'Chats'} text="Live Firebase chat using the same chatrooms and messages structure as the mobile app." />{activeRoom ? renderThread() : renderInbox()}</div>;
}
