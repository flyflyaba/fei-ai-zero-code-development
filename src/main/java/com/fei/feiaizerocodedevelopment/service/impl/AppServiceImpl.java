package com.fei.feiaizerocodedevelopment.service.impl;

import com.mybatisflex.spring.service.impl.ServiceImpl;
import com.fei.feiaizerocodedevelopment.model.entity.App;
import com.fei.feiaizerocodedevelopment.mapper.AppMapper;
import com.fei.feiaizerocodedevelopment.service.AppService;
import org.springframework.stereotype.Service;

/**
 * 应用 服务层实现。
 *
 * @author 飞哥
 */
@Service
public class AppServiceImpl extends ServiceImpl<AppMapper, App>  implements AppService{

}
