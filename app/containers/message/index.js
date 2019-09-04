import React from 'react';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';

import Message from './Message';
import debounce from '../../utils/debounce';
import { SYSTEM_MESSAGES, getMessageTranslation } from './utils';
import messagesStatus from '../../constants/messagesStatus';

export default class MessageContainer extends React.Component {
	static propTypes = {
		item: PropTypes.object.isRequired,
		user: PropTypes.shape({
			id: PropTypes.string.isRequired,
			username: PropTypes.string.isRequired,
			token: PropTypes.string.isRequired
		}),
		timeFormat: PropTypes.string,
		customThreadTimeFormat: PropTypes.string,
		style: PropTypes.any,
		archived: PropTypes.bool,
		broadcast: PropTypes.bool,
		previousItem: PropTypes.object,
		_updatedAt: PropTypes.instanceOf(Date),
		baseUrl: PropTypes.string,
		Message_GroupingPeriod: PropTypes.number,
		isReadReceiptEnabled: PropTypes.bool,
		useRealName: PropTypes.bool,
		useMarkdown: PropTypes.bool,
		autoTranslateRoom: PropTypes.bool,
		autoTranslateLanguage: PropTypes.string,
		status: PropTypes.number,
		onLongPress: PropTypes.func,
		onReactionPress: PropTypes.func,
		onDiscussionPress: PropTypes.func,
		onThreadPress: PropTypes.func,
		errorActionsShow: PropTypes.func,
		replyBroadcast: PropTypes.func,
		reactionInit: PropTypes.func,
		fetchThreadName: PropTypes.func,
		onOpenFileModal: PropTypes.func,
		onReactionLongPress: PropTypes.func,
		navToRoomInfo: PropTypes.func
	}

	static defaultProps = {
		onLongPress: () => {},
		_updatedAt: new Date(),
		archived: false,
		broadcast: false
	}

	componentDidMount() {
		const { item } = this.props;
        if (item.msg === '123123123') {
			console.log('TCL: MessageContainer -> componentDidMount -> item', item);
		}
		if (item && item.observe) {
			const observable = item.observe();
			this.subscription = observable.subscribe((changes) => {
				// TODO: compare changes?
				this.forceUpdate();
			});
		}
	}

	shouldComponentUpdate(nextProps) {
		// const {
		// 	status, item, _updatedAt, autoTranslateRoom
		// } = this.props;

		// if (status !== nextProps.status) {
		// 	return true;
		// }
		// if (autoTranslateRoom !== nextProps.autoTranslateRoom) {
		// 	return true;
		// }
		// if (item.tmsg !== nextProps.item.tmsg) {
		// 	return true;
		// }
		// if (item.unread !== nextProps.item.unread) {
		// 	return true;
		// }

		// return _updatedAt.toISOString() !== nextProps._updatedAt.toISOString();
		return false;
	}

	componentWillUnmount() {
		if (this.subscription && this.subscription.unsubscribe) {
			this.subscription.unsubscribe();
		}
	}

	onPress = debounce(() => {
		const { item } = this.props;
		KeyboardUtils.dismiss();

		if ((item.tlm || item.tmid)) {
			this.onThreadPress();
		}
	}, 300, true);

	onLongPress = () => {
		const { archived, onLongPress, item } = this.props;
		if (this.isInfo || this.hasError || archived) {
			return;
		}
		if (onLongPress) {
			onLongPress(item);
		}
	}

	onErrorPress = () => {
		const { errorActionsShow, item } = this.props;
		if (errorActionsShow) {
			errorActionsShow(item);
		}
	}

	onReactionPress = (emoji) => {
		const { onReactionPress, item } = this.props;
		if (onReactionPress) {
			onReactionPress(emoji, item._id);
		}
	}

	onReactionLongPress = () => {
		const { onReactionLongPress, item } = this.props;
		if (onReactionLongPress) {
			onReactionLongPress(item);
		}
	}

	onDiscussionPress = () => {
		const { onDiscussionPress, item } = this.props;
		if (onDiscussionPress) {
			onDiscussionPress(item);
		}
	}

	onThreadPress = () => {
		const { onThreadPress, item } = this.props;
		if (onThreadPress) {
			onThreadPress(item);
		}
	}

	get isHeader() {
		const {
			item, previousItem, broadcast, Message_GroupingPeriod
		} = this.props;
		if (this.hasError || (previousItem && previousItem.status === messagesStatus.ERROR)) {
			return true;
		}
		try {
			if (previousItem && (
				(previousItem.ts.toDateString() === item.ts.toDateString())
				&& (previousItem.u.username === item.u.username)
				&& !(previousItem.groupable === false || item.groupable === false || broadcast === true)
				&& (item.ts - previousItem.ts < Message_GroupingPeriod * 1000)
				&& (previousItem.tmid === item.tmid)
			)) {
				return false;
			}
			return true;
		} catch (error) {
			return true;
		}
	}

	get isThreadReply() {
		const {
			item, previousItem
		} = this.props;
		if (previousItem && item.tmid && (previousItem.tmid !== item.tmid) && (previousItem._id !== item.tmid)) {
			return true;
		}
		return false;
	}

	get isThreadSequential() {
		const {
			item, previousItem
		} = this.props;
		if (previousItem && item.tmid && ((previousItem.tmid === item.tmid) || (previousItem._id === item.tmid))) {
			return true;
		}
		return false;
	}

	get isInfo() {
		const { item } = this.props;
		return SYSTEM_MESSAGES.includes(item.t);
	}

	get isTemp() {
		const { item } = this.props;
		return item.status === messagesStatus.TEMP || item.status === messagesStatus.ERROR;
	}

	get hasError() {
		const { item } = this.props;
		return item.status === messagesStatus.ERROR;
	}

	// TODO: REMOVE
	parseMessage = () => {
		const { item } = this.props;
		return JSON.parse(JSON.stringify(item));
	}

	reactionInit = () => {
		const { reactionInit, item } = this.props;
		if (reactionInit) {
			reactionInit(item);
		}
	}

	replyBroadcast = () => {
		const { replyBroadcast } = this.props;
		if (replyBroadcast) {
			replyBroadcast(this.parseMessage());
		}
	}

	render() {
		const {
			item, user, style, archived, baseUrl, useRealName, broadcast, fetchThreadName, customThreadTimeFormat, onOpenFileModal, timeFormat, useMarkdown, isReadReceiptEnabled, autoTranslateRoom, autoTranslateLanguage, navToRoomInfo, getCustomEmoji
		} = this.props;
		const {
			id, msg, ts, attachments, urls, reactions, t, avatar, u, alias, editedBy, role, drid, dcount, dlm, tmid, tcount, tlm, tmsg, mentions, channels, unread, autoTranslate: autoTranslateMessage
		} = item;

		let message = msg;
		// "autoTranslateRoom" and "autoTranslateLanguage" are properties from the subscription
		// "autoTranslateMessage" is a toggle between "View Original" and "Translate" state
		if (autoTranslateRoom && autoTranslateMessage) {
			message = getMessageTranslation(item, autoTranslateLanguage) || message;
		}

		// console.count(`${ id }.render calls`);

		return (
			<Message
				id={id}
				msg={message}
				author={u}
				ts={ts}
				type={t}
				attachments={attachments}
				urls={urls}
				reactions={reactions}
				alias={alias}
				avatar={avatar}
				user={user}
				timeFormat={timeFormat}
				customThreadTimeFormat={customThreadTimeFormat}
				style={style}
				archived={archived}
				broadcast={broadcast}
				baseUrl={baseUrl}
				useRealName={useRealName}
				isReadReceiptEnabled={isReadReceiptEnabled}
				unread={unread}
				role={role}
				drid={drid}
				dcount={dcount}
				dlm={dlm}
				tmid={tmid}
				tcount={tcount}
				tlm={tlm}
				tmsg={tmsg}
				useMarkdown={useMarkdown}
				fetchThreadName={fetchThreadName}
				mentions={mentions}
				channels={channels}
				isEdited={editedBy && !!editedBy.username}
				isHeader={this.isHeader}
				isThreadReply={this.isThreadReply}
				isThreadSequential={this.isThreadSequential}
				isInfo={this.isInfo}
				isTemp={this.isTemp}
				hasError={this.hasError}
				onErrorPress={this.onErrorPress}
				onPress={this.onPress}
				onLongPress={this.onLongPress}
				onReactionLongPress={this.onReactionLongPress}
				onReactionPress={this.onReactionPress}
				replyBroadcast={this.replyBroadcast}
				reactionInit={this.reactionInit}
				onDiscussionPress={this.onDiscussionPress}
				onOpenFileModal={onOpenFileModal}
				getCustomEmoji={getCustomEmoji}
				navToRoomInfo={navToRoomInfo}
			/>
		);
	}
}
