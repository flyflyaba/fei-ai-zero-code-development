package com.fei.feiaizerocodedevelopment;

import dev.langchain4j.community.store.embedding.redis.spring.RedisEmbeddingStoreAutoConfiguration;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = {RedisEmbeddingStoreAutoConfiguration.class})
@MapperScan("com.fei.feiaizerocodedevelopment.mapper")
public class FeiAiZeroCodeDevelopmentApplication {

    public static void main(String[] args) {
        SpringApplication.run(FeiAiZeroCodeDevelopmentApplication.class, args);
    }

}
