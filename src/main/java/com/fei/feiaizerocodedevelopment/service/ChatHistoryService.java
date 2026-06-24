package com.fei.feiaizerocodedevelopment.service;

import com.fei.feiaizerocodedevelopment.model.dto.chathistory.ChatHistoryQueryRequest;
import com.fei.feiaizerocodedevelopment.model.entity.User;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;
import com.fei.feiaizerocodedevelopment.model.entity.ChatHistory;

import java.time.LocalDateTime;

/**
 * 对话历史 服务层。
 *
 * @author 飞哥
 */
public interface ChatHistoryService extends IService<ChatHistory> {

    /**
     * 添加对话历史
     *
     * @param appId 应用id
     * @param message 消息
     * @param messageType 消息类型
     * @param userId 用户id
     * @return 是否成功
     */
    boolean addChatMessage(Long appId, String message, String messageType, Long userId);

    /**
     * 根据应用id删除对话记录
     *
     * @param appId
     * @return
     */
    boolean deleteByAppId(Long appId);

    /**
     * 分页查询某APP的对话记录
     *
     * @param appId
     * @param pageSize
     * @param lastCreateTime
     * @param loginUser
     * @return
     */
    Page<ChatHistory> listAppChatHistoryByPage(Long appId, int pageSize,
                                               LocalDateTime lastCreateTime,
                                               User loginUser);

    /**
     * 构造查询条件
     *
     * @param chatHistoryQueryRequest
     * @return
     */
    QueryWrapper getQueryWrapper(ChatHistoryQueryRequest chatHistoryQueryRequest);
}
